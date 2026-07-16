import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

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
const SERVICE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

function svc(): SupabaseClient<Database> {
  return createClient<Database>(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function uid(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const admin = svc();

async function createTestUser() {
  const email = `mrkt-${uid("t")}@example.com`;
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
  return { userId: data.user.id, email };
}

async function cleanupUser(userId: string) {
  await admin.auth.admin.deleteUser(userId);
}

describeOrSkip("Market integration — privileged (service role, not RLS)", () => {
  let userId: string;
  let wsId: string;
  let projectId: string;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.userId;
    wsId = crypto.randomUUID();
    await admin
      .from("workspaces")
      .insert({ id: wsId, name: "Test WS", slug: uid("ws"), created_by: userId });
    await admin
      .from("workspace_members")
      .insert({ workspace_id: wsId, user_id: userId, role: "owner" });
    const { data: proj, error: projError } = await admin
      .from("projects")
      .insert({
        workspace_id: wsId,
        created_by: userId,
        name: "Test Project",
        slug: uid("proj"),
        product_description:
          "A test product for market analysis integration testing with enough characters.",
        preferred_language: "en",
        current_markets: [],
      })
      .select()
      .maybeSingle();
    if (projError) throw projError;
    if (!proj) throw new Error("Project creation returned null");
    projectId = (proj as Record<string, unknown>).id as string;
  }, 15000);

  afterAll(async () => {
    if (userId) await cleanupUser(userId);
  }, 15000);

  it("add target country", async () => {
    const { data, error } = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        country_code: "DE",
        country_name: "Germany",
        added_by: userId,
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect((data as Record<string, unknown>).country_code).toBe("DE");
  });

  it("reject duplicate country", async () => {
    const { error } = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        country_code: "DE",
        country_name: "Germany",
        added_by: userId,
      })
      .select();
    expect(error).toBeTruthy();
  });

  it("allow same country in another project", async () => {
    const { data: p2 } = await admin
      .from("projects")
      .insert({
        workspace_id: wsId,
        created_by: userId,
        name: "P2",
        slug: uid("p2"),
        product_description: "Another test product for market analysis integration testing.",
        preferred_language: "en",
        current_markets: [],
      })
      .select()
      .single();
    const { error } = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsId,
        project_id: (p2 as Record<string, unknown>).id as string,
        country_code: "DE",
        country_name: "Germany",
        added_by: userId,
      })
      .select()
      .single();
    expect(error).toBeNull();
  });

  it("list and update target countries", async () => {
    await admin.from("project_target_countries").insert({
      workspace_id: wsId,
      project_id: projectId,
      country_code: "GB",
      country_name: "United Kingdom",
      added_by: userId,
    });
    const { data } = await admin
      .from("project_target_countries")
      .select("*")
      .eq("workspace_id", wsId)
      .eq("project_id", projectId);
    expect((data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("status transitions: selected → analyzed → shortlisted", async () => {
    const { data: rows } = await admin
      .from("project_target_countries")
      .select("id")
      .eq("project_id", projectId)
      .eq("country_code", "DE")
      .limit(1);
    const id = (rows as unknown as { id: string }[])[0].id;
    await admin.from("project_target_countries").update({ status: "analyzed" }).eq("id", id);
    await admin
      .from("project_target_countries")
      .update({ status: "shortlisted", shortlisted_at: new Date().toISOString() })
      .eq("id", id);
    const { data } = await admin
      .from("project_target_countries")
      .select("status, shortlisted_at")
      .eq("id", id)
      .single();
    expect((data as Record<string, unknown>).status).toBe("shortlisted");
    expect((data as Record<string, unknown>).shortlisted_at).toBeTruthy();
  });

  it("rejected status preserves data", async () => {
    const { data: rows } = await admin
      .from("project_target_countries")
      .select("id")
      .eq("project_id", projectId)
      .eq("country_code", "GB")
      .limit(1);
    const id = (rows as unknown as { id: string }[])[0].id;
    await admin
      .from("project_target_countries")
      .update({ status: "rejected", rejected_at: new Date().toISOString() })
      .eq("id", id);
    const { data } = await admin
      .from("project_target_countries")
      .select("status")
      .eq("id", id)
      .single();
    expect((data as Record<string, unknown>).status).toBe("rejected");
  });

  it("restore from rejected", async () => {
    const { data: rows } = await admin
      .from("project_target_countries")
      .select("id")
      .eq("project_id", projectId)
      .eq("country_code", "GB")
      .limit(1);
    const id = (rows as unknown as { id: string }[])[0].id;
    const { error } = await admin
      .from("project_target_countries")
      .update({ status: "selected", shortlisted_at: null, rejected_at: null })
      .eq("id", id);
    expect(error).toBeNull();
  });

  it("remove country with no history", async () => {
    const fr = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        country_code: "FR",
        country_name: "France",
        added_by: userId,
      })
      .select()
      .single();
    const { error } = await admin
      .from("project_target_countries")
      .delete()
      .eq("id", (fr.data as Record<string, unknown>).id as string);
    expect(error).toBeNull();
  });

  it("market analysis run lifecycle", async () => {
    const { data: tc } = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        country_code: "US",
        country_name: "United States",
        added_by: userId,
      })
      .select()
      .single();
    const tcId = (tc as Record<string, unknown>).id as string;

    const { data: run, error } = await admin
      .from("market_analysis_runs")
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        project_target_country_id: tcId,
        requested_by: userId,
        provider: "mock",
        status: "pending",
        input_snapshot: {},
        analysis_version: "v1",
      })
      .select()
      .single();
    expect(error).toBeNull();
    const runId = (run as Record<string, unknown>).id as string;

    await admin
      .from("market_analysis_runs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", runId);

    const { data: updated } = await admin
      .from("market_analysis_runs")
      .select("status")
      .eq("id", runId)
      .single();
    expect((updated as Record<string, unknown>).status).toBe("running");

    const { data: history } = await admin
      .from("market_analysis_runs")
      .select("id, created_at")
      .eq("project_target_country_id", tcId)
      .order("created_at", { ascending: false });
    expect((history ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("duplicate active run prevented", async () => {
    const { data: tcRow } = await admin
      .from("project_target_countries")
      .select("id")
      .eq("project_id", projectId)
      .eq("country_code", "US")
      .limit(1)
      .maybeSingle();
    const tcId = (tcRow as Record<string, unknown>).id as string;
    const { error } = await admin
      .from("market_analysis_runs")
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        project_target_country_id: tcId,
        requested_by: userId,
        provider: "mock",
        status: "running",
        input_snapshot: {},
        analysis_version: "v1",
      })
      .select();
    expect(error).toBeTruthy();
  });

  // ── Deletion guard tests (requires migration 0013) ─────────────
  // Trigger `trg_prevent_target_country_deletion_with_history` must exist.
  guardDescribe("deletion guard (migration 0013)", () => {
    it("deletion with analysis history rejected (service-role)", async () => {
      const { data: usRows } = await admin
        .from("project_target_countries")
        .select("id")
        .eq("project_id", projectId)
        .eq("country_code", "US")
        .limit(1)
        .maybeSingle();
      if (!usRows) return;
      const usId = (usRows as Record<string, unknown>).id as string;

      const { error } = await admin.from("project_target_countries").delete().eq("id", usId);
      expect(error).not.toBeNull();
      expect(error?.message).toContain("Cannot delete target country");

      const { data: runsAfter } = await admin
        .from("market_analysis_runs")
        .select("id")
        .eq("project_target_country_id", usId);
      expect((runsAfter ?? []).length).toBeGreaterThanOrEqual(1);
    });

    it("deletion with ICP history rejected (service-role)", async () => {
      const tcRes = await admin
        .from("project_target_countries")
        .insert({
          workspace_id: wsId,
          project_id: projectId,
          country_code: "JP",
          country_name: "Japan",
          added_by: userId,
          status: "selected",
        })
        .select()
        .single();
      const jpId = (tcRes.data as Record<string, unknown>).id as string;

      const arRes = await admin
        .from("market_analysis_runs")
        .insert({
          workspace_id: wsId,
          project_id: projectId,
          project_target_country_id: jpId,
          requested_by: userId,
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
          workspace_id: wsId,
          project_id: projectId,
          project_target_country_id: jpId,
          market_analysis_run_id: mrId,
          created_by: userId,
          version: 1,
          status: "draft",
          name: "JP ICP",
          summary: "Test",
          country_code: "JP",
          confidence_reason: "test",
        })
        .select()
        .single();

      const { error } = await admin.from("project_target_countries").delete().eq("id", jpId);
      expect(error).not.toBeNull();
      expect(error?.message).toContain("Cannot delete target country");

      const { data: stillHere } = await admin
        .from("project_target_countries")
        .select("id")
        .eq("id", jpId);
      expect((stillHere ?? []).length).toBe(1);
    });
  });
});
