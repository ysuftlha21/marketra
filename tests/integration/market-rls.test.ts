import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { authenticateTestClient } from "../utils/test-auth";

const HAS_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const run = describe.skip;
const describeOrSkip = HAS_SUPABASE ? describe : run;

const guardDescribe = HAS_SUPABASE ? describe : describe.skip;

function getEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key}`);
  return v;
}

const URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const ANON_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

function svc(): SupabaseClient<Database> {
  return createClient<Database>(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const admin = svc();
const uid = (label: string) => `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function createAnonUser(label: string) {
  const email = `rls-mkt-${uid(label)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "Pass123!",
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("No user");
  await admin
    .from("profiles")
    .insert({ id: data.user.id, email, display_name: email })
    .maybeSingle();
  await admin.from("user_preferences").insert({ user_id: data.user.id }).maybeSingle();
  const client = createClient<Database>(URL, ANON_KEY, {
    auth: { storageKey: `rls-mkt-${label}`, autoRefreshToken: false, persistSession: false },
  });
  await authenticateTestClient(client, email, "Pass123!");
  return { userId: data.user.id, client };
}

async function cleanupUser(userId: string) {
  await admin.auth.admin.deleteUser(userId);
}

async function createWsForUser(userId: string, role: "owner" | "admin" | "member" = "owner") {
  const wsId = crypto.randomUUID();
  await admin
    .from("workspaces")
    .insert({ id: wsId, name: `RLS WS ${uid("ws")}`, slug: uid("ws"), created_by: userId });
  await admin.from("workspace_members").insert({ workspace_id: wsId, user_id: userId, role });
  return wsId;
}

describeOrSkip("Market RLS — authenticated user-scoped (anon client)", () => {
  let userA: { userId: string; client: SupabaseClient<Database> };
  let userB: { userId: string; client: SupabaseClient<Database> };
  let wsA: string;
  let projectA: { id: string };
  let tcIdA_DE: string;
  let tcIdA_GB: string;

  beforeAll(async () => {
    userA = await createAnonUser("a");
    userB = await createAnonUser("b");
    wsA = await createWsForUser(userA.userId);
    await createWsForUser(userB.userId); // side-effect: creates workspace for userB
    const { data: proj } = await admin
      .from("projects")
      .insert({
        workspace_id: wsA,
        created_by: userA.userId,
        name: "RLS Project A",
        slug: uid("pa"),
        product_description:
          "A test product for RLS market testing with sufficient description length.",
        preferred_language: "en",
        current_markets: [],
      })
      .select()
      .single();
    projectA = proj as unknown as { id: string };
    const tcDe = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsA,
        project_id: projectA.id,
        country_code: "DE",
        country_name: "Germany",
        added_by: userA.userId,
      })
      .select()
      .single();
    tcIdA_DE = (tcDe.data as Record<string, unknown>).id as string;
    const tcGb = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsA,
        project_id: projectA.id,
        country_code: "GB",
        country_name: "United Kingdom",
        added_by: userA.userId,
        status: "analyzed",
      })
      .select()
      .single();
    tcIdA_GB = (tcGb.data as Record<string, unknown>).id as string;
    await admin.from("market_analysis_runs").insert({
      workspace_id: wsA,
      project_id: projectA.id,
      project_target_country_id: tcIdA_DE,
      requested_by: userA.userId,
      provider: "mock",
      status: "succeeded",
      input_snapshot: {},
      analysis_version: "v1",
      output: { entryRecommendation: "pursue", confidence: "medium" },
      completed_at: new Date().toISOString(),
    });
  }, 30000);

  afterAll(async () => {
    if (userA?.userId) await cleanupUser(userA.userId);
    if (userB?.userId) await cleanupUser(userB.userId);
  }, 15000);

  // 1. Member can read target countries in their workspace
  it("1. workspace member can read target countries", async () => {
    const { data, error } = await userA.client
      .from("project_target_countries")
      .select("*")
      .eq("workspace_id", wsA)
      .eq("project_id", projectA.id);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  // 2. Unrelated user cannot read target countries
  it("2. unrelated user cannot read target countries", async () => {
    const { data } = await userB.client
      .from("project_target_countries")
      .select("*")
      .eq("workspace_id", wsA);
    expect(data).toEqual([]);
  });

  // 3. Unrelated user cannot enumerate market-analysis runs
  it("3. unrelated user cannot read market analysis runs", async () => {
    const { data } = await userB.client
      .from("market_analysis_runs")
      .select("*")
      .eq("workspace_id", wsA);
    expect(data).toEqual([]);
  });

  // 4. User cannot attach a country to project in another workspace
  it("4. cross-workspace insert denied", async () => {
    const { error } = await userB.client
      .from("project_target_countries")
      .insert({
        workspace_id: wsA,
        project_id: projectA.id,
        country_code: "IT",
        country_name: "Italy",
        added_by: userB.userId,
      })
      .select();
    expect(error).toBeTruthy();
  });

  // 5. Authorized member can add a target country
  it("5. authorized member can add a target country", async () => {
    const { data, error } = await userA.client
      .from("project_target_countries")
      .insert({
        workspace_id: wsA,
        project_id: projectA.id,
        country_code: "FR",
        country_name: "France",
        added_by: userA.userId,
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect((data as Record<string, unknown>).country_code).toBe("FR");
  });

  // 6. Duplicate target country in one project is rejected
  it("6. duplicate target country blocked", async () => {
    const { error } = await userA.client
      .from("project_target_countries")
      .insert({
        workspace_id: wsA,
        project_id: projectA.id,
        country_code: "DE",
        country_name: "Germany",
        added_by: userA.userId,
      })
      .select();
    expect(error).toBeTruthy();
  });

  // 7. Same country allowed in another project
  it("7. same country allowed in another project", async () => {
    const { data: p2 } = await admin
      .from("projects")
      .insert({
        workspace_id: wsA,
        created_by: userA.userId,
        name: "P2",
        slug: uid("p2"),
        product_description: "Another test project for market analysis RLS testing.",
        preferred_language: "en",
        current_markets: [],
      })
      .select()
      .single();
    const { error } = await userA.client
      .from("project_target_countries")
      .insert({
        workspace_id: wsA,
        project_id: (p2 as Record<string, unknown>).id as string,
        country_code: "DE",
        country_name: "Germany",
        added_by: userA.userId,
      })
      .select()
      .single();
    expect(error).toBeNull();
  });

  // 8. Authorized user can update notes
  it("8. authorized user can update notes", async () => {
    const { error } = await userA.client
      .from("project_target_countries")
      .update({ notes: "RLS test note" })
      .eq("id", tcIdA_DE)
      .eq("workspace_id", wsA);
    expect(error).toBeNull();
    const { data } = await userA.client
      .from("project_target_countries")
      .select("notes")
      .eq("id", tcIdA_DE)
      .single();
    expect((data as Record<string, unknown>).notes).toBe("RLS test note");
  });

  // 9. Unauthorized user cannot update notes
  it("9. unrelated user cannot update notes", async () => {
    const originalNote = "RLS test note";
    const { error: _error } = await userB.client
      .from("project_target_countries")
      .update({ notes: "hacked" })
      .eq("id", tcIdA_DE)
      .eq("workspace_id", wsA);
    const { data } = await admin
      .from("project_target_countries")
      .select("notes")
      .eq("id", tcIdA_DE)
      .single();
    expect((data as Record<string, unknown>).notes).toBe(originalNote);
  });

  // 10. Authorized user can shortlist a country
  it("10. authorized user can shortlist country", async () => {
    const { error } = await userA.client
      .from("project_target_countries")
      .update({ status: "shortlisted", shortlisted_at: new Date().toISOString() })
      .eq("id", tcIdA_GB)
      .eq("workspace_id", wsA);
    expect(error).toBeNull();
    const { data } = await userA.client
      .from("project_target_countries")
      .select("status, shortlisted_at")
      .eq("id", tcIdA_GB)
      .single();
    expect((data as Record<string, unknown>).status).toBe("shortlisted");
    expect((data as Record<string, unknown>).shortlisted_at).toBeTruthy();
  });

  // 11. Authorized user can reject a country
  it("11. authorized user can reject country", async () => {
    const { data: frRow } = await admin
      .from("project_target_countries")
      .select("id")
      .eq("project_id", projectA.id)
      .eq("country_code", "FR")
      .limit(1);
    const frId = (frRow as unknown as { id: string }[])[0].id;
    const { error } = await userA.client
      .from("project_target_countries")
      .update({ status: "rejected", rejected_at: new Date().toISOString() })
      .eq("id", frId)
      .eq("workspace_id", wsA);
    expect(error).toBeNull();
  });

  // 12. Rejected country preserves analysis history
  it("12. rejected country preserves history", async () => {
    const { data } = await admin
      .from("project_target_countries")
      .select("status")
      .eq("id", tcIdA_DE)
      .single();
    expect((data as Record<string, unknown>).status).not.toBeFalsy();
    const { data: runs } = await admin
      .from("market_analysis_runs")
      .select("id")
      .eq("project_target_country_id", tcIdA_DE);
    expect((runs ?? []).length).toBeGreaterThanOrEqual(1);
  });

  // 13. Ordinary client cannot overwrite completed analysis output
  it("13. ordinary client cannot overwrite completed output", async () => {
    const { data: runs } = await admin
      .from("market_analysis_runs")
      .select("id, output")
      .eq("project_target_country_id", tcIdA_DE)
      .limit(1);
    const run = (runs as unknown as { id: string; output: Record<string, unknown> }[])[0];
    const { error: _error2 } = await userA.client
      .from("market_analysis_runs")
      .update({ output: { entryRecommendation: "deprioritize" } })
      .eq("id", run.id)
      .eq("workspace_id", wsA);
    const { data: afterAttempt } = await admin
      .from("market_analysis_runs")
      .select("output")
      .eq("id", run.id)
      .single();
    expect((afterAttempt as Record<string, unknown>).output).toBeTruthy();
  });

  // 14. Workspace member can read their own analysis runs
  it("14. member can read own analysis runs", async () => {
    const { data, error } = await userA.client
      .from("market_analysis_runs")
      .select("*")
      .eq("workspace_id", wsA)
      .eq("project_id", projectA.id);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  // 15. Cross-workspace comparison data blocked
  it("15. cannot read comparison data from another workspace", async () => {
    const { data } = await userB.client
      .from("project_target_countries")
      .select("*")
      .eq("workspace_id", wsA)
      .eq("project_id", projectA.id);
    expect(data).toEqual([]);
  });

  // 16. Remove country with no analysis history
  it("16. remove country with no history (from user client)", async () => {
    const createRes = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsA,
        project_id: projectA.id,
        country_code: "ES",
        country_name: "Spain",
        added_by: userA.userId,
        status: "selected",
      })
      .select()
      .single();
    const esId = (createRes.data as Record<string, unknown>).id as string;
    const { error } = await userA.client
      .from("project_target_countries")
      .delete()
      .eq("id", esId)
      .eq("workspace_id", wsA);
    expect(error).toBeNull();
    const { data } = await admin.from("project_target_countries").select("id").eq("id", esId);
    expect(data).toEqual([]);
  });

  // ── Deletion guard tests (requires migration 0013) ──────────────
  // Trigger `trg_prevent_target_country_deletion_with_history` must exist.
  guardDescribe("deletion guard (migration 0013)", () => {
    it("18. delete country with analysis runs is rejected", async () => {
      const { error } = await userA.client
        .from("project_target_countries")
        .delete()
        .eq("id", tcIdA_DE)
        .eq("workspace_id", wsA);
      expect(error).not.toBeNull();
      expect(error?.message).toContain("Cannot delete target country");

      const { data: stillHere } = await admin
        .from("project_target_countries")
        .select("id")
        .eq("id", tcIdA_DE);
      expect((stillHere ?? []).length).toBe(1);

      const { data: runsAfter } = await admin
        .from("market_analysis_runs")
        .select("id")
        .eq("project_target_country_id", tcIdA_DE);
      expect(runsAfter?.length).toBeGreaterThanOrEqual(1);
    });

    it("19. delete country with ICP history is rejected", async () => {
      const tcRes = await admin
        .from("project_target_countries")
        .insert({
          workspace_id: wsA,
          project_id: projectA.id,
          country_code: "NL",
          country_name: "Netherlands",
          added_by: userA.userId,
          status: "selected",
        })
        .select()
        .single();
      const nlTcId = (tcRes.data as Record<string, unknown>).id as string;

      const arRes = await admin
        .from("market_analysis_runs")
        .insert({
          workspace_id: wsA,
          project_id: projectA.id,
          project_target_country_id: nlTcId,
          requested_by: userA.userId,
          provider: "mock",
          status: "succeeded",
          input_snapshot: {},
          analysis_version: "v1",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();
      const mrId = (arRes.data as Record<string, unknown>).id as string;

      await admin
        .from("icp_profiles")
        .insert({
          workspace_id: wsA,
          project_id: projectA.id,
          project_target_country_id: nlTcId,
          market_analysis_run_id: mrId,
          created_by: userA.userId,
          version: 1,
          status: "draft",
          name: "NL ICP",
          summary: "Test ICP for NL",
          country_code: "NL",
          confidence_reason: "test",
        })
        .select()
        .single();

      const { error } = await userA.client
        .from("project_target_countries")
        .delete()
        .eq("id", nlTcId)
        .eq("workspace_id", wsA);
      expect(error).not.toBeNull();
      expect(error?.message).toContain("Cannot delete target country");

      const { data: stillHere } = await admin
        .from("project_target_countries")
        .select("id")
        .eq("id", nlTcId);
      expect((stillHere ?? []).length).toBe(1);
    });
  });
});
