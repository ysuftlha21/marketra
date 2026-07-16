import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import type { Plan } from "@/config/plans";

export interface WorkspaceUsage {
  activeProjects: number;
  creationsUsed: number;
  decisionRoleGenerationsUsed: number;
  outreachGenerationsUsed: number;
}

function getCurrentPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { period_start: start.toISOString(), period_end: end.toISOString() };
}

/**
 * Core logic — accepts any Supabase client so this can be called from
 * server components (via createServerClient), server actions, AND integration
 * tests (via a service-role client). No Next.js request-scope dependency.
 */
export async function getWorkspaceUsageWithClient(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<WorkspaceUsage> {
  const { period_start, period_end } = getCurrentPeriod();

  const { count: activeProjects } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .neq("status", "archived");

  const { data: decisionRoleUsage } = await supabase
    .from("workspace_usage_periods")
    .select("used")
    .eq("workspace_id", workspaceId)
    .eq("metric", "decision_role_generations")
    .gte("period_start", period_start)
    .lte("period_end", period_end)
    .single();

  const { data: periodUsage } = await supabase
    .from("workspace_usage_periods")
    .select("used")
    .eq("workspace_id", workspaceId)
    .eq("metric", "project_creations")
    .gte("period_start", period_start)
    .lte("period_end", period_end)
    .single();

  const { data: outreachUsage } = await supabase
    .from("workspace_usage_periods")
    .select("used")
    .eq("workspace_id", workspaceId)
    .eq("metric", "outreach_generations")
    .gte("period_start", period_start)
    .lte("period_end", period_end)
    .single();

  return {
    activeProjects: activeProjects || 0,
    creationsUsed: periodUsage?.used || 0,
    decisionRoleGenerationsUsed: decisionRoleUsage?.used || 0,
    outreachGenerationsUsed: outreachUsage?.used || 0,
  };
}

export async function checkProjectCreationAllowanceWithClient(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  plan: Plan,
) {
  const usage = await getWorkspaceUsageWithClient(supabase, workspaceId);
  if (usage.creationsUsed >= plan.projectCreationsPerPeriod) {
    throw new Error(
      `Plan limit reached: You can only create ${plan.projectCreationsPerPeriod} projects per billing period.`,
    );
  }
}

export async function consumeProjectCreationWithClient(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  idempotencyKey: string,
  plan: Plan,
) {
  const { period_start, period_end } = getCurrentPeriod();

  await checkProjectCreationAllowanceWithClient(supabase, workspaceId, plan);

  const { error: eventError } = await supabase.from("workspace_usage_events").insert({
    workspace_id: workspaceId,
    idempotency_key: idempotencyKey,
    metric: "project_creations",
    amount: 1,
  });

  if (eventError) {
    if (eventError.code === "23505") {
      return; // idempotent — already consumed
    }
    throw new Error("Failed to record usage event");
  }

  const { data: existingPeriod } = await supabase
    .from("workspace_usage_periods")
    .select("id, used")
    .eq("workspace_id", workspaceId)
    .eq("metric", "project_creations")
    .gte("period_start", period_start)
    .lte("period_end", period_end)
    .single();

  if (existingPeriod) {
    await supabase
      .from("workspace_usage_periods")
      .update({ used: existingPeriod.used + 1 })
      .eq("id", existingPeriod.id);
  } else {
    await supabase.from("workspace_usage_periods").insert({
      workspace_id: workspaceId,
      period_start,
      period_end,
      metric: "project_creations",
      used: 1,
    });
  }
}

export async function checkActiveProjectsAllowanceWithClient(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  plan: Plan,
) {
  const usage = await getWorkspaceUsageWithClient(supabase, workspaceId);
  if (usage.activeProjects >= plan.maxActiveProjects) {
    throw new Error(
      `Plan limit reached: You can only have ${plan.maxActiveProjects} active projects at a time.`,
    );
  }
}

// ─── Next.js request-scope wrappers (used in server components & actions) ────

export async function getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsage> {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  const supabase = createServiceRoleClient();
  return getWorkspaceUsageWithClient(supabase, workspaceId);
}

export async function checkProjectCreationAllowance(workspaceId: string, plan: Plan) {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  const supabase = createServiceRoleClient();
  return checkProjectCreationAllowanceWithClient(supabase, workspaceId, plan);
}

export async function consumeProjectCreation(
  workspaceId: string,
  idempotencyKey: string,
  plan: Plan,
) {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  const supabase = createServiceRoleClient();
  return consumeProjectCreationWithClient(supabase, workspaceId, idempotencyKey, plan);
}

export async function checkActiveProjectsAllowance(workspaceId: string, plan: Plan) {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  const supabase = createServiceRoleClient();
  return checkActiveProjectsAllowanceWithClient(supabase, workspaceId, plan);
}

export async function checkDecisionRoleGenerationAllowanceWithClient(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  plan: Plan,
) {
  const usage = await getWorkspaceUsageWithClient(supabase, workspaceId);
  if (usage.decisionRoleGenerationsUsed >= plan.decisionRoleGenerationsPerPeriod) {
    throw new Error(
      `Plan limit reached: You can only generate decision roles ${plan.decisionRoleGenerationsPerPeriod} times per billing period.`,
    );
  }
}

export async function consumeDecisionRoleGenerationWithClient(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  idempotencyKey: string,
  plan: Plan,
) {
  const { period_start, period_end } = getCurrentPeriod();

  await checkDecisionRoleGenerationAllowanceWithClient(supabase, workspaceId, plan);

  const { error: eventError } = await supabase.from("workspace_usage_events").insert({
    workspace_id: workspaceId,
    idempotency_key: idempotencyKey,
    metric: "decision_role_generations",
    amount: 1,
  });

  if (eventError) {
    if (eventError.code === "23505") {
      return; // idempotent
    }
    throw new Error("Failed to record usage event");
  }

  const { data: existingPeriod } = await supabase
    .from("workspace_usage_periods")
    .select("id, used")
    .eq("workspace_id", workspaceId)
    .eq("metric", "decision_role_generations")
    .gte("period_start", period_start)
    .lte("period_end", period_end)
    .single();

  if (existingPeriod) {
    await supabase
      .from("workspace_usage_periods")
      .update({ used: existingPeriod.used + 1 })
      .eq("id", existingPeriod.id);
  } else {
    await supabase.from("workspace_usage_periods").insert({
      workspace_id: workspaceId,
      period_start,
      period_end,
      metric: "decision_role_generations",
      used: 1,
    });
  }
}

export async function checkDecisionRoleGenerationAllowance(workspaceId: string, plan: Plan) {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  const supabase = createServiceRoleClient();
  return checkDecisionRoleGenerationAllowanceWithClient(supabase, workspaceId, plan);
}

export async function consumeDecisionRoleGeneration(
  workspaceId: string,
  idempotencyKey: string,
  plan: Plan,
) {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  const supabase = createServiceRoleClient();
  return consumeDecisionRoleGenerationWithClient(supabase, workspaceId, idempotencyKey, plan);
}

export async function checkOutreachGenerationAllowanceWithClient(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  plan: Plan,
) {
  const usage = await getWorkspaceUsageWithClient(supabase, workspaceId);
  if (usage.outreachGenerationsUsed >= plan.outreachGenerationsPerPeriod) {
    throw new Error(
      `Plan limit reached: You can only generate outreach ${plan.outreachGenerationsPerPeriod} times per billing period.`,
    );
  }
}

export async function consumeOutreachGenerationWithClient(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  idempotencyKey: string,
  plan: Plan,
) {
  const { period_start, period_end } = getCurrentPeriod();

  await checkOutreachGenerationAllowanceWithClient(supabase, workspaceId, plan);

  const { error: eventError } = await supabase.from("workspace_usage_events").insert({
    workspace_id: workspaceId,
    idempotency_key: idempotencyKey,
    metric: "outreach_generations",
    amount: 1,
  });

  if (eventError) {
    if (eventError.code === "23505") {
      return; // idempotent
    }
    throw new Error("Failed to record usage event");
  }

  const { data: existingPeriod } = await supabase
    .from("workspace_usage_periods")
    .select("id, used")
    .eq("workspace_id", workspaceId)
    .eq("metric", "outreach_generations")
    .gte("period_start", period_start)
    .lte("period_end", period_end)
    .single();

  if (existingPeriod) {
    await supabase
      .from("workspace_usage_periods")
      .update({ used: existingPeriod.used + 1 })
      .eq("id", existingPeriod.id);
  } else {
    await supabase.from("workspace_usage_periods").insert({
      workspace_id: workspaceId,
      period_start,
      period_end,
      metric: "outreach_generations",
      used: 1,
    });
  }
}

export async function checkOutreachGenerationAllowance(workspaceId: string, plan: Plan) {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  const supabase = createServiceRoleClient();
  return checkOutreachGenerationAllowanceWithClient(supabase, workspaceId, plan);
}

export async function consumeOutreachGeneration(
  workspaceId: string,
  idempotencyKey: string,
  plan: Plan,
) {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  const supabase = createServiceRoleClient();
  return consumeOutreachGenerationWithClient(supabase, workspaceId, idempotencyKey, plan);
}
