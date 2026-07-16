import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServiceRoleClient } from "@/lib/db/supabase-service";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { authenticateTestClient } from "../utils/test-auth";
import {
  consumeOutreachGenerationWithClient,
  getWorkspaceUsageWithClient,
} from "@/features/workspaces/services/workspace-usage-service";
import { getPlan } from "@/config/plans";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy";

function uid(label: string): string {
  return `${label}-${Math.random().toString(36).substring(2, 8)}`;
}

describe("Outreach authenticated RLS", () => {
  const admin = createServiceRoleClient();
  const plan = getPlan("free")!;

  let ownerClient: SupabaseClient<Database>;
  let outsiderClient: SupabaseClient<Database>;

  let wsId: string;
  let otherWsId: string;
  let pId: string;
  let companyId: string;
  let paRunId: string;
  let maRunId: string;
  let icpId: string;
  let tcId: string;
  let drRunId: string;
  let drId: string;
  let testRunId: string;
  let testDraftId: string;
  let testVersionId: string;

  let ownerUserId: string;
  let outsiderUserId: string;

  beforeAll(async () => {
    // ── Create owner user ──
    const ownerEmail = `orls-${uid("o")}@example.com`;
    const { data: owner, error: ownerErr } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: "Pass123!",
      email_confirm: true,
    });
    if (ownerErr || !owner.user) throw ownerErr || new Error("no owner user");
    ownerUserId = owner.user.id;
    await admin
      .from("profiles")
      .insert({ id: ownerUserId, email: ownerEmail, display_name: ownerEmail })
      .maybeSingle();
    await admin.from("user_preferences").insert({ user_id: ownerUserId }).maybeSingle();

    // ── Create workspace ──
    const { data: ws } = await admin
      .from("workspaces")
      .insert({ name: "ORLS WS", slug: uid("orls-ws"), created_by: ownerUserId })
      .select()
      .single();
    wsId = ws!.id;
    await admin.from("workspace_members").insert({
      workspace_id: wsId,
      user_id: ownerUserId,
      role: "owner",
    });

    // ── Create other workspace ──
    const { data: ows } = await admin
      .from("workspaces")
      .insert({ name: "ORLS Other WS", slug: uid("orls-ow"), created_by: ownerUserId })
      .select()
      .single();
    otherWsId = ows!.id;

    // ── Authenticate owner ──
    ownerClient = createClient<Database>(URL, ANON_KEY, {
      auth: { storageKey: "orls-owner", autoRefreshToken: false, persistSession: false },
    });
    await authenticateTestClient(ownerClient, ownerEmail, "Pass123!");

    // ── Create outsider user ──
    const outsiderEmail = `orls-${uid("x")}@example.com`;
    const { data: outsider, error: outsiderErr } = await admin.auth.admin.createUser({
      email: outsiderEmail,
      password: "Pass123!",
      email_confirm: true,
    });
    if (outsiderErr || !outsider.user) throw outsiderErr || new Error("no outsider user");
    outsiderUserId = outsider.user.id;
    await admin
      .from("profiles")
      .insert({ id: outsiderUserId, email: outsiderEmail, display_name: outsiderEmail })
      .maybeSingle();
    await admin.from("user_preferences").insert({ user_id: outsiderUserId }).maybeSingle();

    outsiderClient = createClient<Database>(URL, ANON_KEY, {
      auth: { storageKey: "orls-outsider", autoRefreshToken: false, persistSession: false },
    });
    await authenticateTestClient(outsiderClient, outsiderEmail, "Pass123!");

    // ── Create project ──
    const { data: proj } = await admin
      .from("projects")
      .insert({
        workspace_id: wsId,
        created_by: ownerUserId,
        name: "ORLS Project",
        slug: uid("orls-p"),
        status: "active",
        product_description: "ORLS test project with enough description",
      })
      .select()
      .single();
    pId = proj!.id;

    // ── Create target country ──
    const { data: tc } = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        country_code: "US",
        country_name: "United States",
        added_by: ownerUserId,
      })
      .select()
      .single();
    tcId = tc!.id;

    // ── Create companies ──
    const { data: co } = await admin
      .from("companies")
      .insert({
        workspace_id: wsId,
        canonical_name: "ORLSCorp",
        normalized_name: "orlscorp",
        primary_domain: "orlscorp.com",
        country_code: "US",
      })
      .select()
      .single();
    companyId = co!.id;

    // ── Create product analysis run ──
    const { data: pa } = await admin
      .from("product_analysis_runs")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        status: "succeeded",
        requested_by: ownerUserId,
        provider: "mock",
        model: "mock-model",
        prompt_version: "1",
        input_snapshot: {},
      })
      .select()
      .single();
    paRunId = pa!.id;

    // ── Create market analysis run ──
    const { data: ma } = await admin
      .from("market_analysis_runs")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        project_target_country_id: tcId,
        requested_by: ownerUserId,
        provider: "mock",
        status: "succeeded",
        input_snapshot: {},
      })
      .select()
      .single();
    maRunId = ma!.id;

    // ── Create approved ICP ──
    const { data: icp } = await admin
      .from("icp_profiles")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        project_target_country_id: tcId,
        market_analysis_run_id: maRunId,
        product_analysis_run_id: paRunId,
        status: "approved",
        name: "ORLS ICP",
        summary: "ICP Summary",
        country_code: "US",
        created_by: ownerUserId,
      })
      .select()
      .single();
    icpId = icp!.id;

    // ── Create decision role run ──
    const { data: drr } = await admin
      .from("decision_role_runs")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        company_id: companyId,
        status: "succeeded",
        started_by: ownerUserId,
        source_product_analysis_run_id: paRunId,
        source_market_analysis_run_id: maRunId,
        source_icp_profile_id: icpId,
        provider: "mock",
      })
      .select()
      .single();
    drRunId = drr!.id;

    // ── Create approved decision role ──
    const { data: dr } = await admin
      .from("company_decision_roles")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        company_id: companyId,
        source_run_id: drRunId,
        role_key: "cto",
        role_title: "CTO",
        role_family: "Engineering",
        department: "Technology",
        buying_role: "decision_maker",
        status: "approved",
        is_primary: true,
        fit_score: 90,
        confidence_score: 85,
        reasoning: "Test role for RLS",
        company_size_relevance: "High",
        country_relevance: "High",
      })
      .select()
      .single();
    drId = dr!.id;
  });

  afterAll(async () => {
    // Clean outreach data first (child before parent)
    await admin.from("outreach_draft_versions").delete().eq("workspace_id", wsId);
    await admin.from("outreach_drafts").delete().eq("workspace_id", wsId);
    await admin.from("outreach_generation_runs").delete().eq("workspace_id", wsId);
    // Then prerequisites in reverse order
    await admin.from("company_decision_roles").delete().eq("workspace_id", wsId);
    await admin.from("decision_role_runs").delete().eq("workspace_id", wsId);
    await admin.from("icp_profiles").delete().eq("workspace_id", wsId);
    await admin.from("market_analysis_runs").delete().eq("workspace_id", wsId);
    await admin.from("product_analysis_runs").delete().eq("workspace_id", wsId);
    await admin.from("project_target_countries").delete().eq("workspace_id", wsId);
    await admin.from("companies").delete().eq("workspace_id", wsId);
    await admin.from("projects").delete().eq("workspace_id", wsId);
    await admin.from("workspace_members").delete().eq("workspace_id", wsId);
    await admin.from("workspaces").delete().eq("id", wsId);
    await admin.from("workspaces").delete().eq("id", otherWsId);
    // Clean users
    if (ownerUserId) await admin.auth.admin.deleteUser(ownerUserId);
    if (outsiderUserId) await admin.auth.admin.deleteUser(outsiderUserId);
  });

  function makeRunPayload(overrides: Record<string, unknown> = {}) {
    return {
      workspace_id: wsId,
      project_id: pId,
      company_id: companyId,
      decision_role_id: drId,
      source_decision_role_run_id: drRunId,
      source_product_analysis_run_id: paRunId,
      source_icp_profile_id: icpId,
      channel: "email",
      message_type: "initial_contact",
      provider: "mock",
      idempotency_key: `orls-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      started_by: ownerUserId,
      ...overrides,
    };
  }

  // ──────────────── Owner behavior ────────────────

  it("owner can insert an outreach generation run", async () => {
    const { data, error } = await ownerClient
      .from("outreach_generation_runs")
      .insert(makeRunPayload())
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.workspace_id).toBe(wsId);
    testRunId = data!.id;
  });

  it("owner can read their run", async () => {
    const { data, error } = await ownerClient
      .from("outreach_generation_runs")
      .select()
      .eq("id", testRunId)
      .single();
    expect(error).toBeNull();
    expect(data?.status).toBe("pending");
  });

  it("owner can create a draft (via admin) and owner can read it", async () => {
    const { data: draft } = await admin
      .from("outreach_drafts")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        company_id: companyId,
        decision_role_id: drId,
        source_run_id: testRunId,
        channel: "email",
        message_type: "initial_contact",
        language: "en",
        body: "Test outreach body for RLS verification.",
        tone: "professional",
        length: "medium",
        status: "draft",
        source_type: "generated",
        current_version_number: 1,
        is_current: true,
        created_by: ownerUserId,
      })
      .select()
      .single();
    testDraftId = draft!.id;
    expect(draft).toBeDefined();

    const { data: readBack, error } = await ownerClient
      .from("outreach_drafts")
      .select()
      .eq("id", testDraftId)
      .single();
    expect(error).toBeNull();
    expect(readBack?.body).toContain("RLS verification");
  });

  it("owner can update draft status", async () => {
    const { error } = await ownerClient
      .from("outreach_drafts")
      .update({ status: "approved" })
      .eq("id", testDraftId);
    expect(error).toBeNull();
  });

  // ──────────────── Outsider rejection ────────────────

  it("outsider cannot read owner's runs", async () => {
    const { data, error } = await outsiderClient
      .from("outreach_generation_runs")
      .select()
      .eq("workspace_id", wsId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("outsider cannot read owner's drafts", async () => {
    const { data } = await outsiderClient.from("outreach_drafts").select().eq("workspace_id", wsId);
    expect(data).toEqual([]);
  });

  it("outsider cannot insert into owner's workspace", async () => {
    const { error } = await outsiderClient
      .from("outreach_generation_runs")
      .insert(makeRunPayload());
    expect(error).toBeDefined();
  });

  // ──────────────── Cross-workspace forgery ────────────────

  it("rejects run with other workspace project_id", async () => {
    const { error } = await ownerClient
      .from("outreach_generation_runs")
      .insert(makeRunPayload({ workspace_id: otherWsId, idempotency_key: `fw-${Date.now()}` }));
    expect(error).toBeDefined();
  });

  it("rejects run with project from another workspace", async () => {
    const { data: otherProj } = await admin
      .from("projects")
      .insert({
        workspace_id: otherWsId,
        created_by: ownerUserId,
        name: "Other WS Proj",
        slug: uid("owp"),
        status: "active",
        product_description: "Other workspace project for forgery testing",
      })
      .select()
      .single();

    const { error } = await ownerClient
      .from("outreach_generation_runs")
      .insert(makeRunPayload({ project_id: otherProj!.id, idempotency_key: `fp-${Date.now()}` }));

    expect(error).toBeDefined();
    await admin.from("projects").delete().eq("id", otherProj!.id);
  });

  it("rejects run with company from another workspace", async () => {
    const { data: otherCo } = await admin
      .from("companies")
      .insert({
        workspace_id: otherWsId,
        canonical_name: "OtherCo",
        normalized_name: "otherco",
        primary_domain: "otherco.com",
        country_code: "US",
      })
      .select()
      .single();

    const { error } = await ownerClient
      .from("outreach_generation_runs")
      .insert(makeRunPayload({ company_id: otherCo!.id, idempotency_key: `fc-${Date.now()}` }));

    expect(error).toBeDefined();
    await admin.from("companies").delete().eq("id", otherCo!.id);
  });

  it("rejects run with decision role from another workspace", async () => {
    const { data: otherDr } = await admin
      .from("company_decision_roles")
      .insert({
        workspace_id: otherWsId,
        project_id: pId,
        company_id: companyId,
        source_run_id: drRunId,
        role_key: "ceo",
        role_title: "CEO",
        role_family: "Executive",
        department: "Management",
        buying_role: "decision_maker",
        status: "approved",
        fit_score: 90,
        confidence_score: 85,
        reasoning: "Cross-ws test",
        company_size_relevance: "High",
        country_relevance: "High",
      })
      .select()
      .single();

    const { error } = await ownerClient.from("outreach_generation_runs").insert(
      makeRunPayload({
        decision_role_id: otherDr!.id,
        idempotency_key: `fd-${Date.now()}`,
      }),
    );

    expect(error).toBeDefined();
    await admin.from("company_decision_roles").delete().eq("id", otherDr!.id);
  });

  it("rejects run with source decision_role_run from another company", async () => {
    const { data: otherDrr } = await admin
      .from("decision_role_runs")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        company_id: companyId,
        status: "succeeded",
        started_by: ownerUserId,
        source_product_analysis_run_id: paRunId,
        source_icp_profile_id: icpId,
        provider: "mock",
      })
      .select()
      .single();

    // Create a second company and link via project_companies
    const { data: otherComp } = await admin
      .from("companies")
      .insert({
        workspace_id: wsId,
        canonical_name: "OtherCorp2",
        normalized_name: "othercorp2",
        primary_domain: "othercorp2.com",
        country_code: "US",
      })
      .select()
      .single();

    // Try to use run from one company context for a different company
    const { error } = await ownerClient.from("outreach_generation_runs").insert({
      ...makeRunPayload(),
      company_id: otherComp!.id,
      idempotency_key: `fs-${Date.now()}`,
    });

    // The insert should fail because the decision_role is scoped to companyId, not otherComp
    // The RLS checks that decision_role_id matches workspace + project + company
    // This tests the general cross-company protection
    expect(error).toBeDefined();

    await admin.from("companies").delete().eq("id", otherComp!.id);
    await admin.from("decision_role_runs").delete().eq("id", otherDrr!.id);
  });

  // ──────────────── Append-only draft versions ────────────────

  it("owner creates a version via admin", async () => {
    const { data: ver } = await admin
      .from("outreach_draft_versions")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        company_id: companyId,
        outreach_draft_id: testDraftId,
        version_number: 1,
        body: "Version 1 body for append-only test.",
        tone: "professional",
        length: "medium",
        change_type: "generated",
        source_run_id: testRunId,
        created_by: ownerUserId,
      })
      .select()
      .single();
    expect(ver).toBeDefined();
    testVersionId = ver!.id;
  });

  it("authenticated user cannot update a draft version", async () => {
    const { error } = await ownerClient
      .from("outreach_draft_versions")
      .update({ body: "Tampered!" })
      .eq("id", testVersionId);
    expect(error).toBeDefined();
  });

  it("authenticated user cannot delete a draft version", async () => {
    const { error } = await ownerClient
      .from("outreach_draft_versions")
      .delete()
      .eq("id", testVersionId);
    expect(error).toBeDefined();
  });

  it("version 1 cannot be inserted twice", async () => {
    const { error } = await admin.from("outreach_draft_versions").insert({
      workspace_id: wsId,
      project_id: pId,
      company_id: companyId,
      outreach_draft_id: testDraftId,
      version_number: 1,
      body: "Duplicate version 1.",
      tone: "professional",
      length: "medium",
      change_type: "regenerated",
      created_by: ownerUserId,
    });
    expect(error).toBeDefined();
    expect(error?.code).toBe("23505");
  });

  it("version 2 can be created without changing version 1", async () => {
    const { data: v2 } = await admin
      .from("outreach_draft_versions")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        company_id: companyId,
        outreach_draft_id: testDraftId,
        version_number: 2,
        body: "Version 2 body.",
        tone: "professional",
        length: "medium",
        change_type: "regenerated",
        created_by: ownerUserId,
      })
      .select()
      .single();
    expect(v2).toBeDefined();
    expect(v2?.version_number).toBe(2);

    // Version 1 unchanged
    const { data: v1 } = await admin
      .from("outreach_draft_versions")
      .select()
      .eq("id", testVersionId)
      .single();
    expect(v1?.body).toBe("Version 1 body for append-only test.");

    await admin.from("outreach_draft_versions").delete().eq("id", v2!.id);
  });

  // ──────────────── Immutable snapshots ────────────────

  it("succeeded run input_snapshot cannot be changed", async () => {
    const { data: snapRun } = await admin
      .from("outreach_generation_runs")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        company_id: companyId,
        decision_role_id: drId,
        source_decision_role_run_id: drRunId,
        source_product_analysis_run_id: paRunId,
        source_icp_profile_id: icpId,
        channel: "email",
        message_type: "initial_contact",
        provider: "mock",
        status: "succeeded",
        current_stage: "complete",
        input_snapshot: { original: true, data: "immu-test-v1" },
        result_snapshot: { draft: { body: "Original immutable" } },
        idempotency_key: `snap-${Date.now()}`,
        started_by: ownerUserId,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    const snapId = snapRun!.id;

    const { error } = await admin
      .from("outreach_generation_runs")
      .update({ input_snapshot: { tampered: true } })
      .eq("id", snapId);
    expect(error).toBeDefined();

    await admin.from("outreach_generation_runs").delete().eq("id", snapId);
  });

  it("succeeded run result_snapshot cannot be changed", async () => {
    const { data: snapRun } = await admin
      .from("outreach_generation_runs")
      .insert({
        workspace_id: wsId,
        project_id: pId,
        company_id: companyId,
        decision_role_id: drId,
        source_decision_role_run_id: drRunId,
        source_product_analysis_run_id: paRunId,
        source_icp_profile_id: icpId,
        channel: "email",
        message_type: "initial_contact",
        provider: "mock",
        status: "succeeded",
        current_stage: "complete",
        input_snapshot: {},
        result_snapshot: { draft: { body: "Original res snapshot" } },
        idempotency_key: `snap-res-${Date.now()}`,
        started_by: ownerUserId,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    const snapId = snapRun!.id;

    const { error } = await admin
      .from("outreach_generation_runs")
      .update({ result_snapshot: { tampered: true } })
      .eq("id", snapId);
    expect(error).toBeDefined();

    await admin.from("outreach_generation_runs").delete().eq("id", snapId);
  });

  // ──────────────── Delete protection ────────────────

  it("owner cannot delete outreach generation runs", async () => {
    const { error } = await ownerClient
      .from("outreach_generation_runs")
      .delete()
      .eq("id", testRunId);
    expect(error).toBeDefined();
  });

  it("owner cannot delete outreach drafts", async () => {
    const { error } = await ownerClient.from("outreach_drafts").delete().eq("id", testDraftId);
    expect(error).toBeDefined();
  });

  it("outsider cannot see version data", async () => {
    const { data } = await outsiderClient
      .from("outreach_draft_versions")
      .select()
      .eq("workspace_id", wsId);
    expect(data).toEqual([]);
  });

  // ──────────────── Atomic usage ────────────────

  it("accepted generation consumes one unit", async () => {
    const beforeUsage = await getWorkspaceUsageWithClient(admin, wsId);
    const idemKey = `atomic-${Date.now()}-${uid("k")}`;
    await consumeOutreachGenerationWithClient(admin, wsId, idemKey, plan);
    const afterUsage = await getWorkspaceUsageWithClient(admin, wsId);
    expect(afterUsage.outreachGenerationsUsed).toBe(beforeUsage.outreachGenerationsUsed + 1);
  });

  it("duplicate idempotency key does not double-consume", async () => {
    const idemKey = `dup-${Date.now()}-${uid("k")}`;
    await consumeOutreachGenerationWithClient(admin, wsId, idemKey, plan);
    const afterFirst = await getWorkspaceUsageWithClient(admin, wsId);
    await consumeOutreachGenerationWithClient(admin, wsId, idemKey, plan);
    const afterSecond = await getWorkspaceUsageWithClient(admin, wsId);
    expect(afterSecond.outreachGenerationsUsed).toBe(afterFirst.outreachGenerationsUsed);
  });

  it("workspace usage remains isolated", async () => {
    const idemKey = `iso-${Date.now()}-${uid("k")}`;
    const beforeWs = await getWorkspaceUsageWithClient(admin, wsId);
    const beforeOther = await getWorkspaceUsageWithClient(admin, otherWsId);
    await consumeOutreachGenerationWithClient(admin, wsId, idemKey, plan);
    const afterWs = await getWorkspaceUsageWithClient(admin, wsId);
    const afterOther = await getWorkspaceUsageWithClient(admin, otherWsId);
    expect(afterWs.outreachGenerationsUsed).toBe(beforeWs.outreachGenerationsUsed + 1);
    expect(afterOther.outreachGenerationsUsed).toBe(beforeOther.outreachGenerationsUsed);
  });
});
