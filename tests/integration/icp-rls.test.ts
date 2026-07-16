import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { authenticateTestClient } from "../utils/test-auth";

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
const ANON_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

function svc(): SupabaseClient<Database> {
  return createClient<Database>(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
const admin = svc();
const uid = (l: string) => `${l}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function createAnonUser(label: string) {
  const email = `rls-icp-${uid(label)}@example.com`;
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
    auth: { storageKey: `rls-icp-${label}`, autoRefreshToken: false, persistSession: false },
  });
  await authenticateTestClient(client, email, "Pass123!");
  return { userId: data.user.id, client };
}

async function cleanupUser(userId: string) {
  await admin.auth.admin.deleteUser(userId);
}

describeOrSkip("ICP RLS — authenticated user (anon client)", () => {
  let userA: { userId: string; client: SupabaseClient<Database> };
  let userB: { userId: string; client: SupabaseClient<Database> };
  let wsA: string;
  let tcId: string;
  let icpId: string;

  beforeAll(async () => {
    userA = await createAnonUser("a");
    userB = await createAnonUser("b");
    wsA = crypto.randomUUID();
    await admin
      .from("workspaces")
      .insert({ id: wsA, name: "WS", slug: uid("ws"), created_by: userA.userId });
    await admin
      .from("workspace_members")
      .insert({ workspace_id: wsA, user_id: userA.userId, role: "owner" });
    const p = await admin
      .from("projects")
      .insert({
        workspace_id: wsA,
        created_by: userA.userId,
        name: "P",
        slug: uid("p"),
        product_description: "A test product for ICP RLS testing with enough characters.",
        preferred_language: "en",
        current_markets: [],
      })
      .select()
      .single();
    const pid = (p.data as Record<string, unknown>).id as string;
    const tc = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsA,
        project_id: pid,
        country_code: "DE",
        country_name: "Germany",
        added_by: userA.userId,
      })
      .select()
      .single();
    tcId = (tc.data as Record<string, unknown>).id as string;
    const mr = await admin
      .from("market_analysis_runs")
      .insert({
        workspace_id: wsA,
        project_id: pid,
        project_target_country_id: tcId,
        requested_by: userA.userId,
        provider: "mock",
        status: "succeeded",
        input_snapshot: {},
        analysis_version: "v1",
        output: { entryRecommendation: "pursue", confidence: "medium" },
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    const mrId = (mr.data as Record<string, unknown>).id as string;
    const run = await admin
      .from("icp_generation_runs")
      .insert({
        workspace_id: wsA,
        project_id: pid,
        project_target_country_id: tcId,
        market_analysis_run_id: mrId,
        requested_by: userA.userId,
        provider: "mock",
        status: "succeeded",
        input_snapshot: {},
        generation_version: "v1",
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    const runId = (run.data as Record<string, unknown>).id as string;
    const icp = await admin
      .from("icp_profiles")
      .insert({
        workspace_id: wsA,
        project_id: pid,
        project_target_country_id: tcId,
        market_analysis_run_id: mrId,
        created_by: userA.userId,
        current_generation_run_id: runId,
        version: 1,
        status: "draft",
        name: "Test ICP",
        summary: "Test",
        country_code: "DE",
        confidence: "medium",
        confidence_reason: "test",
      })
      .select()
      .single();
    icpId = (icp.data as Record<string, unknown>).id as string;
  }, 30000);

  afterAll(async () => {
    if (userA) await cleanupUser(userA.userId);
    if (userB) await cleanupUser(userB.userId);
  }, 15000);

  it("1. member can read ICPs in their workspace", async () => {
    const { data, error } = await userA.client
      .from("icp_profiles")
      .select("*")
      .eq("workspace_id", wsA);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("2. unrelated user cannot read ICPs", async () => {
    const { data } = await userB.client.from("icp_profiles").select("*").eq("workspace_id", wsA);
    expect(data).toEqual([]);
  });

  it("3. unrelated user cannot read ICP runs", async () => {
    const { data } = await userB.client
      .from("icp_generation_runs")
      .select("*")
      .eq("workspace_id", wsA);
    expect(data).toEqual([]);
  });

  it("4. cross-workspace ICP insert denied", async () => {
    const { error } = await userB.client
      .from("icp_profiles")
      .insert({
        workspace_id: wsA,
        project_target_country_id: tcId,
        market_analysis_run_id: "x",
        created_by: userB.userId,
        name: "x",
        summary: "x",
        country_code: "DE",
        confidence_reason: "x",
      } as never)
      .select();
    expect(error).toBeTruthy();
  });

  it("5. authorized user can update draft ICP", async () => {
    const { error } = await userA.client
      .from("icp_profiles")
      .update({ summary: "RLS updated" } as never)
      .eq("workspace_id", wsA)
      .eq("id", icpId);
    expect(error).toBeNull();
  });

  it("6. unrelated user cannot update ICP", async () => {
    await userB.client
      .from("icp_profiles")
      .update({ summary: "hacked" } as never)
      .eq("id", icpId)
      .eq("workspace_id", wsA);
    const { data } = await admin.from("icp_profiles").select("summary").eq("id", icpId).single();
    expect((data as Record<string, unknown>).summary).toBe("RLS updated");
  });
});
