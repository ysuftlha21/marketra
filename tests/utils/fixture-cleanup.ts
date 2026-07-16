import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

export interface CleanupResult {
  desktopUserId?: string;
  desktopWorkspaceId?: string;
  mobileUserId?: string;
  mobileWorkspaceId?: string;
  deletedCounts: Record<string, number>;
}

export const E2E_ALLOWED_SUPABASE_PROJECT_REF = "jwgnifnnmhudamthzjzj";

function checkEnvironment() {
  try {
    const lines = readFileSync(resolve(".env.local"), "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eqIdx = trimmed.indexOf("=");
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  } catch (err) {
    console.error("Warning: Failed to load .env.local", err);
  }

  if (process.env.NODE_ENV !== "test") {
    throw new Error("Fixture cleanup aborted: NODE_ENV is not 'test'");
  }
  if (process.env.E2E_TEST_MODE !== "true") {
    throw new Error("Fixture cleanup aborted: E2E_TEST_MODE is not 'true'");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!url.startsWith("https://")) {
    throw new Error("Fixture cleanup aborted: Supabase URL is not valid HTTPS");
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith(".supabase.co")) {
      throw new Error(
        "Fixture cleanup aborted: Supabase URL hostname is not a valid Supabase project hostname",
      );
    }
    const ref = parsed.hostname.split(".")[0];
    if (ref !== E2E_ALLOWED_SUPABASE_PROJECT_REF) {
      throw new Error(
        "Fixture cleanup aborted: Parsed project reference does not exactly match approved test-project reference",
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Fixture cleanup aborted")) throw err;
    throw new Error("Fixture cleanup aborted: Invalid Supabase URL format");
  }
}

async function resolveWorkspaceForUser(
  supabase: SupabaseClient,
  userId: string,
  expectedLabel: string,
) {
  // E2E users should only own one workspace in this context, but we will specifically check the name
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, created_by")
    .eq("created_by", userId);

  if (error || !workspaces || workspaces.length === 0) {
    throw new Error(`Failed to resolve workspace for ${expectedLabel}: Not found`);
  }
  if (workspaces.length > 1) {
    throw new Error(`Failed to resolve workspace for ${expectedLabel}: Duplicate workspaces found`);
  }

  const ws = workspaces[0];
  if (!ws || (!ws.name.includes("E2E") && !ws.slug.includes("e2e"))) {
    throw new Error(
      `Failed to resolve workspace for ${expectedLabel}: Name '${ws?.name}' and slug '${ws?.slug}' do not indicate an E2E fixture`,
    );
  }

  return ws.id;
}

export async function resolveE2EUsersAndWorkspaces(
  supabase: SupabaseClient,
  desktopEmail: string,
  mobileEmail: string,
) {
  let desktopUserId: string | undefined;
  let mobileUserId: string | undefined;

  let hasMore = true;
  let page = 1;
  const perPage = 50;

  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw new Error("Failed to list users");
    }

    for (const u of data.users) {
      if (u.email === desktopEmail) {
        if (desktopUserId) throw new Error("Duplicate desktop E2E user found");
        desktopUserId = u.id;
      }
      if (u.email === mobileEmail) {
        if (mobileUserId) throw new Error("Duplicate mobile E2E user found");
        mobileUserId = u.id;
      }
    }

    if (data.users.length < perPage || (desktopUserId && mobileUserId)) {
      hasMore = false;
    } else {
      page++;
    }
  }

  if (!desktopUserId) throw new Error("Missing desktop fixture user");
  if (!mobileUserId) throw new Error("Missing mobile fixture user");

  const desktopWorkspaceId = await resolveWorkspaceForUser(supabase, desktopUserId, "desktop");
  const mobileWorkspaceId = await resolveWorkspaceForUser(supabase, mobileUserId, "mobile");

  return { desktopUserId, desktopWorkspaceId, mobileUserId, mobileWorkspaceId };
}

async function deleteFromTable(
  supabase: SupabaseClient,
  table: string,
  workspaceId: string,
  maxDeletes: number,
  counts: Record<string, number>,
) {
  // First count
  const { count, error: countErr } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (countErr) {
    throw new Error(`Failed to count records in ${table}: ${countErr.message}`);
  }

  if (count === null || count === undefined) {
    throw new Error(`Failed to count records in ${table}: count is null`);
  }

  if (count > maxDeletes) {
    throw new Error(`Abort: ${count} records in ${table} exceeds max threshold of ${maxDeletes}`);
  }

  if (count > 0) {
    const { error: delErr } = await supabase.from(table).delete().eq("workspace_id", workspaceId);

    if (delErr) {
      throw new Error(`Failed to delete from ${table}: ${delErr.message}`);
    }
  }

  counts[table] = (counts[table] || 0) + count;
}

export async function performScopedCleanup(
  supabase: SupabaseClient,
  workspaceId: string,
  counts: Record<string, number>,
) {
  // We specify maximum safety bounds for each table to avoid runaway deletions
  // Order relies on deleting children before parents
  const cleanupPlan = [
    { table: "decision_role_feedback", max: 500 },
    { table: "company_decision_roles", max: 500 },
    { table: "decision_role_runs", max: 50 },
    { table: "project_companies", max: 500 },
    { table: "companies", max: 500 },
    { table: "company_discovery_runs", max: 50 },
    { table: "icp_generation_runs", max: 50 },
    { table: "icp_profiles", max: 50 },
    { table: "project_clarification_answers", max: 100 },
    { table: "market_analysis_runs", max: 50 },
    { table: "project_target_countries", max: 50 },
    { table: "product_analysis_runs", max: 50 },
    { table: "projects", max: 20 },
    { table: "workspace_usage_events", max: 100 },
    { table: "workspace_usage_periods", max: 10 },
  ];

  for (const step of cleanupPlan) {
    await deleteFromTable(supabase, step.table, workspaceId, step.max, counts);
  }
}

export async function cleanTestFixtures(): Promise<CleanupResult> {
  checkEnvironment();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Fixture cleanup aborted: Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const desktopEmail = process.env.E2E_DESKTOP_USER_EMAIL || "e2e-test@example.com";
  const mobileEmail = process.env.E2E_MOBILE_USER_EMAIL || "e2e-test-mobile@example.com";

  const { desktopUserId, desktopWorkspaceId, mobileUserId, mobileWorkspaceId } =
    await resolveE2EUsersAndWorkspaces(supabase, desktopEmail, mobileEmail);

  const deletedCounts: Record<string, number> = {};

  // Clean Desktop Fixture
  await performScopedCleanup(supabase, desktopWorkspaceId, deletedCounts);

  // Clean Mobile Fixture
  await performScopedCleanup(supabase, mobileWorkspaceId, deletedCounts);

  return {
    desktopUserId,
    desktopWorkspaceId,
    mobileUserId,
    mobileWorkspaceId,
    deletedCounts,
  };
}
