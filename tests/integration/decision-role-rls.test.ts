import { describe, it, expect, beforeAll } from "vitest";
import { createServiceRoleClient } from "@/lib/db/supabase-service";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy";
import { authenticateTestClient } from "../utils/test-auth";

function uid(label: string): string {
  return `${label}-${Math.random().toString(36).substring(2, 8)}`;
}

describe("Decision Role RLS", () => {
  let wsId: string;
  let pId: string;
  let cId: string;
  let drId: string;
  let runId: string;

  let ownerClient: SupabaseClient<Database>;
  let otherClient: SupabaseClient<Database>;
  let testUserId: string;
  let otherUserId: string;

  beforeAll(async () => {
    const admin = createServiceRoleClient();

    // Create test user
    const email = `dr-test-${uid("u")}@example.com`;
    const { data: user, error: err } = await admin.auth.admin.createUser({
      email,
      password: "Pass123!",
      email_confirm: true,
    });
    if (err || !user.user) throw err || new Error("no user");
    testUserId = user.user.id;
    await admin
      .from("profiles")
      .insert({ id: testUserId, email, display_name: email })
      .maybeSingle();
    await admin.from("user_preferences").insert({ user_id: testUserId }).maybeSingle();

    const wsSlug = uid("ws");
    const { data: ws, error: wsError } = await admin
      .from("workspaces")
      .insert({ name: "DR WS", slug: wsSlug, created_by: testUserId })
      .select()
      .single();
    if (wsError) throw wsError;
    wsId = ws!.id;

    await admin.from("workspace_members").insert({
      workspace_id: wsId,
      user_id: testUserId,
      role: "owner",
    });

    const { data: p } = await admin
      .from("projects")
      .insert({
        workspace_id: wsId,
        created_by: testUserId,
        name: "DR Proj",
        slug: uid("p"),
        status: "active",
        product_description: "Desc",
      })
      .select()
      .single();
    pId = p!.id;

    const { data: tc, error: tcError } = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        country_code: "US",
        country_name: "United States",
        added_by: testUserId,
      })
      .select()
      .single();
    if (tcError) throw tcError;

    const { data: c } = await admin
      .from("companies")
      .insert({
        workspace_id: wsId,
        canonical_name: "TestCorp",
        normalized_name: "testcorp",
        primary_domain: "testcorp.com",
        country_code: "US",
      })
      .select()
      .single();
    cId = c!.id;

    const { data: pa } = await admin
      .from("product_analysis_runs")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        status: "succeeded",
        requested_by: testUserId,
        provider: "mock",
        model: "mock-model",
        prompt_version: "1",
        input_snapshot: {},
      })
      .select()
      .single();
    const paId = pa!.id;

    const { data: ma } = await admin
      .from("market_analysis_runs")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        project_target_country_id: tc!.id,
        requested_by: testUserId,
        provider: "mock",
        status: "succeeded",
        input_snapshot: {},
      })
      .select()
      .single();
    const maId = ma!.id;

    const { data: icp } = await admin
      .from("icp_profiles")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        project_target_country_id: tc!.id,
        market_analysis_run_id: maId,
        product_analysis_run_id: paId,
        status: "approved",
        name: "Test ICP",
        summary: "ICP Summary",
        country_code: "US",
        created_by: testUserId,
      })
      .select()
      .single();
    const icpId = icp!.id;

    const { data: run } = await admin
      .from("decision_role_runs")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        company_id: cId,
        status: "succeeded",
        started_by: testUserId,
        source_product_analysis_run_id: paId,
        source_market_analysis_run_id: maId,
        source_icp_profile_id: icpId,
        provider: "mock",
      })
      .select()
      .single();
    runId = run!.id;

    const { data: dr } = await admin
      .from("company_decision_roles")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        company_id: cId,
        source_run_id: runId,
        role_key: "ceo",
        role_title: "CEO",
        role_family: "Executive",
        department: "Executive",
        buying_role: "decision_maker",
        status: "suggested",
        fit_score: 95,
        confidence_score: 90,
        reasoning: "Test",
        company_size_relevance: "High",
        country_relevance: "High",
      })
      .select()
      .single();
    drId = dr!.id;

    ownerClient = createClient<Database>(URL, ANON_KEY, {
      auth: { storageKey: "owner", autoRefreshToken: false, persistSession: false },
    });
    await authenticateTestClient(ownerClient, email, "Pass123!");

    const email2 = `dr-test-other-${uid("u")}@example.com`;
    const { data: user2, error: err2 } = await admin.auth.admin.createUser({
      email: email2,
      password: "Pass123!",
      email_confirm: true,
    });
    if (err2 || !user2.user) throw err2 || new Error("no user");
    otherUserId = user2.user.id;
    await admin
      .from("profiles")
      .insert({ id: user2.user.id, email: email2, display_name: email2 })
      .maybeSingle();
    await admin.from("user_preferences").insert({ user_id: user2.user.id }).maybeSingle();

    otherClient = createClient<Database>(URL, ANON_KEY, {
      auth: { storageKey: "other", autoRefreshToken: false, persistSession: false },
    });
    await authenticateTestClient(otherClient, email2, "Pass123!");
  });

  it("owner can select roles in their workspace", async () => {
    const { data, error } = await ownerClient
      .from("company_decision_roles")
      .select("*")
      .eq("id", drId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].role_title).toBe("CEO");
  });

  it("stranger cannot select roles in another workspace", async () => {
    const { data, error } = await otherClient
      .from("company_decision_roles")
      .select("*")
      .eq("id", drId);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it("owner can insert feedback", async () => {
    const { error } = await ownerClient.from("decision_role_feedback").insert({
      workspace_id: wsId,
      project_id: pId,
      company_id: cId,
      decision_role_id: drId,
      action: "approved",
      created_by: testUserId,
    });
    expect(error).toBeNull();
  });

  it("stranger cannot insert feedback", async () => {
    const { error } = await otherClient.from("decision_role_feedback").insert({
      workspace_id: wsId,
      project_id: pId,
      company_id: cId,
      decision_role_id: drId,
      action: "rejected",
      created_by: otherUserId,
    });
    expect(error).toBeTruthy();
  });

  it("owner cannot delete feedback (append-only)", async () => {
    const { error } = await ownerClient
      .from("decision_role_feedback")
      .delete()
      .eq("decision_role_id", drId);
    expect(error).not.toBeNull();
  });
});
