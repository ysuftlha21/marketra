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
  const email = `rls-co-${uid(label)}@example.com`;
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
    auth: { storageKey: `rls-co-${label}`, autoRefreshToken: false, persistSession: false },
  });
  await authenticateTestClient(client, email, "Pass123!");
  return { userId: data.user.id, client };
}

async function cleanupUser(userId: string) {
  await admin.auth.admin.deleteUser(userId);
}

describeOrSkip("Company RLS — authenticated user (anon client)", () => {
  let userA: { userId: string; client: SupabaseClient<Database> };
  let userB: { userId: string; client: SupabaseClient<Database> };
  let wsA: string;
  let companyId: string;
  let runId: string;
  let pcId: string;
  let projectId: string;
  let tcId: string;

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
        product_description: "A test product for company RLS testing with enough characters.",
        preferred_language: "en",
        current_markets: [],
      })
      .select()
      .single();
    projectId = (p.data as Record<string, unknown>).id as string;
    const tc = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsA,
        project_id: projectId,
        country_code: "DE",
        country_name: "Germany",
        added_by: userA.userId,
      })
      .select()
      .single();
    tcId = (tc.data as Record<string, unknown>).id as string;
    const co = await admin
      .from("companies")
      .insert({
        workspace_id: wsA,
        canonical_name: "TestCorp",
        normalized_name: "testcorp",
        primary_domain: "testcorp-" + uid("d") + ".com",
        normalized_domain: "testcorp-" + uid("d") + ".com",
        country_code: "DE",
        industry: "SaaS",
        industry_tags: ["SaaS"],
        source_provider: "mock",
      })
      .select()
      .single();
    companyId = (co.data as Record<string, unknown>).id as string;
    const run = await admin
      .from("company_discovery_runs")
      .insert({
        workspace_id: wsA,
        project_id: projectId,
        target_country_id: tcId,
        provider: "mock",
        provider_version: "0.1.0",
        status: "completed",
        input_snapshot: {},
        criteria_snapshot: {},
        result_summary: { totalCandidates: 1 },
        created_by: userA.userId,
      })
      .select()
      .single();
    runId = (run.data as Record<string, unknown>).id as string;
    const pc = await admin
      .from("project_companies")
      .insert({
        workspace_id: wsA,
        project_id: projectId,
        target_country_id: tcId,
        company_id: companyId,
        discovery_run_id: runId,
        status: "discovered",
        fit_score: 75,
        fit_grade: "strong",
        qualification_reasons: [],
        disqualification_reasons: [],
        matched_signals: [],
        missing_signals: [],
        confidence_score: 80,
        scoring_snapshot: {},
      })
      .select()
      .single();
    pcId = (pc.data as Record<string, unknown>).id as string;
  }, 30000);

  afterAll(async () => {
    if (userA) await cleanupUser(userA.userId);
    if (userB) await cleanupUser(userB.userId);
  }, 15000);

  it("1. member can read companies in their workspace", async () => {
    const { data, error } = await userA.client
      .from("companies")
      .select("*")
      .eq("workspace_id", wsA);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("2. member can read discovery runs in their workspace", async () => {
    const { data, error } = await userA.client
      .from("company_discovery_runs")
      .select("*")
      .eq("workspace_id", wsA);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("3. member can read project companies in their workspace", async () => {
    const { data, error } = await userA.client
      .from("project_companies")
      .select("*")
      .eq("workspace_id", wsA);
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("4. unrelated user cannot read companies", async () => {
    const { data } = await userB.client.from("companies").select("*").eq("workspace_id", wsA);
    expect(data).toEqual([]);
  });

  it("5. unrelated user cannot read discovery runs", async () => {
    const { data } = await userB.client
      .from("company_discovery_runs")
      .select("*")
      .eq("workspace_id", wsA);
    expect(data).toEqual([]);
  });

  it("6. unrelated user cannot read project companies", async () => {
    const { data } = await userB.client
      .from("project_companies")
      .select("*")
      .eq("workspace_id", wsA);
    expect(data).toEqual([]);
  });

  it("7. cross-workspace company insert denied", async () => {
    const { error } = await userB.client
      .from("companies")
      .insert({
        workspace_id: wsA,
        canonical_name: "x",
        normalized_name: "x",
        country_code: "DE",
        industry: "x",
      } as never)
      .select();
    expect(error).toBeTruthy();
  });

  it("8. cross-workspace discovery run insert denied", async () => {
    const { error } = await userB.client
      .from("company_discovery_runs")
      .insert({
        workspace_id: wsA,
        project_id: projectId,
        target_country_id: tcId,
        provider: "mock",
        provider_version: "1",
        status: "queued",
        input_snapshot: {},
        criteria_snapshot: {},
        created_by: userB.userId,
      } as never)
      .select();
    expect(error).toBeTruthy();
  });

  it("9. cross-workspace project company insert denied", async () => {
    const { error } = await userB.client
      .from("project_companies")
      .insert({
        workspace_id: wsA,
        project_id: projectId,
        target_country_id: tcId,
        company_id: companyId,
        discovery_run_id: runId,
        status: "discovered",
        fit_score: 50,
        fit_grade: "medium",
        qualification_reasons: [],
        disqualification_reasons: [],
        matched_signals: [],
        missing_signals: [],
        confidence_score: 50,
        scoring_snapshot: {},
      } as never)
      .select();
    expect(error).toBeTruthy();
  });

  it("10. authorized user can update company", async () => {
    const { error } = await userA.client
      .from("companies")
      .update({ industry: "Fintech" } as never)
      .eq("workspace_id", wsA)
      .eq("id", companyId);
    expect(error).toBeNull();
  });

  it("11. authorized user can update project company status", async () => {
    const { error } = await userA.client
      .from("project_companies")
      .update({ status: "approved", reviewer_notes: "RLS test" } as never)
      .eq("workspace_id", wsA)
      .eq("id", pcId);
    expect(error).toBeNull();
  });
});
