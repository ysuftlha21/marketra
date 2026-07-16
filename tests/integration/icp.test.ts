import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

const HAS_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const describeOrSkip = HAS_SUPABASE ? describe : describe.skip;

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
const admin = svc();
const uid = (l: string) => `${l}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function createTestUser() {
  const email = `icp-${uid("t")}@example.com`;
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

describeOrSkip("ICP — privileged integration (service role)", () => {
  let userId: string;
  let wsId: string;
  let projectId: string;
  let tcId: string;
  let mRunId: string;

  beforeAll(async () => {
    const u = await createTestUser();
    userId = u.userId;
    wsId = crypto.randomUUID();
    await admin
      .from("workspaces")
      .insert({ id: wsId, name: "WS", slug: uid("ws"), created_by: userId });
    await admin
      .from("workspace_members")
      .insert({ workspace_id: wsId, user_id: userId, role: "owner" });
    const p = await admin
      .from("projects")
      .insert({
        workspace_id: wsId,
        created_by: userId,
        name: "P",
        slug: uid("p"),
        product_description:
          "A test product for ICP integration testing with enough description length.",
        preferred_language: "en",
        current_markets: [],
      })
      .select()
      .single();
    projectId = (p.data as Record<string, unknown>).id as string;
    const tc = await admin
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
    tcId = (tc.data as Record<string, unknown>).id as string;
    const mr = await admin
      .from("market_analysis_runs")
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        project_target_country_id: tcId,
        requested_by: userId,
        provider: "mock",
        status: "succeeded",
        input_snapshot: {},
        analysis_version: "v1",
        output: { entryRecommendation: "pursue", confidence: "medium" },
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    mRunId = (mr.data as Record<string, unknown>).id as string;
    await admin.from("product_analysis_runs").insert({
      workspace_id: wsId,
      project_id: projectId,
      requested_by: userId,
      provider: "mock",
      status: "succeeded",
      input_snapshot: {},
      output: { productSummary: "test", confidence: "medium" },
      completed_at: new Date().toISOString(),
    });
  }, 30000);

  afterAll(async () => {
    if (userId) await cleanupUser(userId);
  }, 15000);

  it("create ICP generation run", async () => {
    const { data, error } = await admin
      .from("icp_generation_runs" as never)
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        project_target_country_id: tcId,
        market_analysis_run_id: mRunId,
        requested_by: userId,
        provider: "mock",
        status: "pending",
        input_snapshot: {},
        generation_version: "v1",
      } as never)
      .select()
      .single();
    expect(error).toBeNull();
    expect((data as Record<string, unknown>).status).toBe("pending");
  });

  it("create versioned draft ICP", async () => {
    const { data: run } = await admin
      .from("icp_generation_runs" as never)
      .select("id")
      .eq("project_target_country_id" as never, tcId as never)
      .limit(1)
      .maybeSingle();
    const rId = (run as Record<string, unknown> | null)?.id as string;
    const { data, error } = await admin
      .from("icp_profiles" as never)
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        project_target_country_id: tcId,
        market_analysis_run_id: mRunId,
        created_by: userId,
        current_generation_run_id: rId,
        version: 1,
        status: "draft",
        name: "Test ICP",
        summary: "Test",
        country_code: "DE",
        confidence: "medium",
        confidence_reason: "test",
      } as never)
      .select()
      .single();
    expect(error).toBeNull();
    expect((data as Record<string, unknown>).version).toBe(1);
  });

  it("version increments for second run", async () => {
    const { data, error } = await admin
      .from("icp_profiles" as never)
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        project_target_country_id: tcId,
        market_analysis_run_id: mRunId,
        created_by: userId,
        version: 2,
        status: "draft",
        name: "ICP v2",
        summary: "v2",
        country_code: "DE",
        confidence: "low",
        confidence_reason: "",
      } as never)
      .select()
      .single();
    expect(error).toBeNull();
    expect((data as Record<string, unknown>).version).toBe(2);
  });

  it("approve ICP", async () => {
    const { data: rows } = await admin
      .from("icp_profiles" as never)
      .select("id")
      .eq("project_target_country_id" as never, tcId as never)
      .eq("status" as never, "draft" as never)
      .limit(1);
    const id = (rows as unknown as { id: string }[])[0].id;
    const { error } = await admin
      .from("icp_profiles" as never)
      .update({
        status: "approved",
        approved_by: userId,
        approved_at: new Date().toISOString(),
      } as never)
      .eq("id" as never, id as never);
    expect(error).toBeNull();
  });

  it("reject ICP", async () => {
    const { data: rows } = await admin
      .from("icp_profiles" as never)
      .select("id")
      .eq("project_target_country_id" as never, tcId as never)
      .eq("status" as never, "draft" as never)
      .limit(1);
    const id = (rows as unknown as { id: string }[])[0].id;
    const { error } = await admin
      .from("icp_profiles" as never)
      .update({
        status: "rejected",
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
      } as never)
      .eq("id" as never, id as never);
    expect(error).toBeNull();
  });

  it("restore rejected ICP to draft", async () => {
    const { data: rows } = await admin
      .from("icp_profiles" as never)
      .select("id")
      .eq("project_target_country_id" as never, tcId as never)
      .eq("status" as never, "rejected" as never)
      .limit(1);
    const id = (rows as unknown as { id: string }[])[0].id;
    const { error } = await admin
      .from("icp_profiles" as never)
      .update({ status: "draft" } as never)
      .eq("id" as never, id as never);
    expect(error).toBeNull();
  });

  it("prevent duplicate active run", async () => {
    await admin
      .from("icp_generation_runs" as never)
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        project_target_country_id: tcId,
        market_analysis_run_id: mRunId,
        requested_by: userId,
        provider: "mock",
        status: "running",
        input_snapshot: {},
        generation_version: "v1",
      } as never)
      .select();
    const { error } = await admin
      .from("icp_generation_runs" as never)
      .insert({
        workspace_id: wsId,
        project_id: projectId,
        project_target_country_id: tcId,
        market_analysis_run_id: mRunId,
        requested_by: userId,
        provider: "mock",
        status: "pending",
        input_snapshot: {},
        generation_version: "v1",
      } as never)
      .select();
    expect(error).toBeTruthy();
  });
});
