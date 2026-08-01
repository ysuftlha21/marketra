import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { boundedE2eFetch } from "./bounded-fetch";

export interface CleanupResult {
  desktopUserId?: string;
  desktopWorkspaceId?: string;
  mobileUserId?: string;
  mobileWorkspaceId?: string;
  stateUserId?: string;
  stateWorkspaceId?: string;
  desktopOutreachWorkspaceId?: string;
  mobileOutreachWorkspaceId?: string;
  stateOutreachWorkspaceId?: string;
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

async function resolveWorkspacesForUser(
  supabase: SupabaseClient,
  userId: string,
  expectedLabel: string,
) {
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, created_by")
    .eq("created_by", userId);

  if (error || !workspaces || workspaces.length === 0) {
    throw new Error(`Failed to resolve workspace for ${expectedLabel}: Not found`);
  }
  if (workspaces.length > 2) {
    throw new Error(`Failed to resolve workspace for ${expectedLabel}: Too many workspaces found`);
  }
  for (const workspace of workspaces) {
    if (!workspace.name.includes("E2E") && !workspace.slug.includes("e2e")) {
      throw new Error(
        `Failed to resolve workspace for ${expectedLabel}: Workspace '${workspace.name}' is not an E2E fixture`,
      );
    }
  }

  const outreach = workspaces.find((workspace) => workspace.slug.startsWith("e2e-outreach-"));
  const primary = workspaces.find((workspace) => workspace.id !== outreach?.id);
  if (!primary) throw new Error(`Failed to resolve primary workspace for ${expectedLabel}`);
  return { primaryId: primary.id, outreachId: outreach?.id };
}

export async function resolveE2EUsersAndWorkspaces(
  supabase: SupabaseClient,
  desktopEmail: string,
  mobileEmail: string,
  stateEmail?: string,
) {
  let desktopUserId: string | undefined;
  let mobileUserId: string | undefined;
  let stateUserId: string | undefined;

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
      if (stateEmail && u.email === stateEmail) {
        if (stateUserId) throw new Error("Duplicate state E2E user found");
        stateUserId = u.id;
      }
    }

    if (
      data.users.length < perPage ||
      (desktopUserId && mobileUserId && (!stateEmail || stateUserId))
    ) {
      hasMore = false;
    } else {
      page++;
    }
  }

  if (!desktopUserId) throw new Error("Missing desktop fixture user");
  if (!mobileUserId) throw new Error("Missing mobile fixture user");

  const desktopWorkspaces = await resolveWorkspacesForUser(supabase, desktopUserId, "desktop");
  const mobileWorkspaces = await resolveWorkspacesForUser(supabase, mobileUserId, "mobile");
  const stateWorkspaces =
    stateEmail && stateUserId
      ? await resolveWorkspacesForUser(supabase, stateUserId, "outreach states")
      : undefined;

  return {
    desktopUserId,
    desktopWorkspaceId: desktopWorkspaces.primaryId,
    desktopOutreachWorkspaceId: desktopWorkspaces.outreachId,
    mobileUserId,
    mobileWorkspaceId: mobileWorkspaces.primaryId,
    mobileOutreachWorkspaceId: mobileWorkspaces.outreachId,
    stateUserId,
    stateWorkspaceId: stateWorkspaces?.primaryId,
    stateOutreachWorkspaceId: stateWorkspaces?.outreachId,
  };
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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { fetch: boundedE2eFetch },
  });
  const desktopEmail = process.env.E2E_DESKTOP_USER_EMAIL || "e2e-test@example.com";
  const mobileEmail = process.env.E2E_MOBILE_USER_EMAIL || "e2e-test-mobile@example.com";
  const stateEmail = process.env.E2E_SIGNOUT_USER_EMAIL || "e2e-test-signout@example.com";

  const {
    desktopUserId,
    desktopWorkspaceId,
    mobileUserId,
    mobileWorkspaceId,
    stateUserId,
    stateWorkspaceId,
    desktopOutreachWorkspaceId,
    mobileOutreachWorkspaceId,
    stateOutreachWorkspaceId,
  } = await resolveE2EUsersAndWorkspaces(supabase, desktopEmail, mobileEmail, stateEmail);

  const deletedCounts: Record<string, number> = {};

  // Clean Desktop Fixture
  await performScopedCleanup(supabase, desktopWorkspaceId, deletedCounts);

  // Clean Mobile Fixture
  await performScopedCleanup(supabase, mobileWorkspaceId, deletedCounts);
  if (stateWorkspaceId) {
    await performScopedCleanup(supabase, stateWorkspaceId, deletedCounts);
  }
  for (const outreachWorkspaceId of [
    desktopOutreachWorkspaceId,
    mobileOutreachWorkspaceId,
    stateOutreachWorkspaceId,
  ]) {
    if (outreachWorkspaceId) {
      await performScopedCleanup(supabase, outreachWorkspaceId, deletedCounts);
    }
  }

  return {
    desktopUserId,
    desktopWorkspaceId,
    mobileUserId,
    mobileWorkspaceId,
    stateUserId,
    stateWorkspaceId,
    desktopOutreachWorkspaceId,
    mobileOutreachWorkspaceId,
    stateOutreachWorkspaceId,
    deletedCounts,
  };
}
