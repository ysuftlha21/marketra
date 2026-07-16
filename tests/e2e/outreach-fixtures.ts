import { test, expect } from "@playwright/test";
import { createServiceRoleClient } from "@/lib/db/supabase-service";

const E2E_ALLOWED_REF = "jwgnifnnmhudamthzjzj";

interface OutreachFixtures {
  workspaceId: string;
  projectId: string;
  projectSlug: string;
  countryCode: string;
  countryId: string;
  companyId: string;
  primaryRoleId: string;
  secondaryRoleId: string;
}

/**
 * This is exposed as a utility for global fixture setup, not called from specs.
 * Specs use the storageState which authenticates as E2E users.
 */
export async function setupOutreachE2EFixtures(): Promise<{
  desktop: OutreachFixtures;
  mobile: OutreachFixtures;
}> {
  // Verify environment safety
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!url.includes(E2E_ALLOWED_REF)) {
    throw new Error("E2E fixture setup blocked: not the approved test project");
  }
  if (process.env.E2E_TEST_MODE !== "true") {
    throw new Error("E2E fixture setup blocked: E2E_TEST_MODE not set");
  }

  const admin = createServiceRoleClient();

  async function createFixtureGraph(userEmail: string, label: string): Promise<OutreachFixtures> {
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
    const user = users?.users.find((u) => u.email === userEmail);
    if (!user) throw new Error(`E2E user ${userEmail} not found`);
    const userId = user.id;

    // Find or create workspace
    const { data: workspaces } = await admin
      .from("workspaces")
      .select("id, slug")
      .eq("created_by", userId)
      .limit(1);

    let workspaceId: string;
    if (workspaces && workspaces.length > 0) {
      workspaceId = workspaces[0].id;
    } else {
      const { data: ws } = await admin
        .from("workspaces")
        .insert({
          name: `${label} WS`,
          slug: `outreach-${label.toLowerCase()}-${Date.now()}`,
          created_by: userId,
        })
        .select()
        .single();
      workspaceId = ws!.id;
      await admin
        .from("workspace_members")
        .insert({ workspace_id: workspaceId, user_id: userId, role: "owner" });
    }

    const slug = `outreach-${label.toLowerCase()}-${Date.now()}`;

    // Clean existing outreach data
    await admin.from("outreach_draft_versions").delete().eq("workspace_id", workspaceId);
    await admin.from("outreach_drafts").delete().eq("workspace_id", workspaceId);
    await admin.from("outreach_generation_runs").delete().eq("workspace_id", workspaceId);

    // Create project
    const { data: proj } = await admin
      .from("projects")
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        name: `${label} Proj`,
        slug,
        status: "active",
        product_description: "Outreach E2E test project for Phase 8.2 verification",
      })
      .select()
      .single();
    const projectId = proj!.id;

    // Product analysis run
    const { data: pa } = await admin
      .from("product_analysis_runs")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        status: "succeeded",
        requested_by: userId,
        provider: "mock",
        model: "mock-model",
        prompt_version: "1",
        input_snapshot: {},
      })
      .select()
      .single();

    // Target country
    const { data: tc } = await admin
      .from("project_target_countries")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        country_code: "US",
        country_name: "United States",
        added_by: userId,
      })
      .select()
      .single();

    // Market analysis run
    const { data: ma } = await admin
      .from("market_analysis_runs")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        project_target_country_id: tc!.id,
        requested_by: userId,
        provider: "mock",
        status: "succeeded",
        input_snapshot: {},
      })
      .select()
      .single();

    // ICP
    const { data: icp } = await admin
      .from("icp_profiles")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        project_target_country_id: tc!.id,
        market_analysis_run_id: ma!.id,
        product_analysis_run_id: pa!.id,
        status: "approved",
        name: `${label} ICP`,
        summary: "E2E ICP",
        country_code: "US",
        created_by: userId,
      })
      .select()
      .single();

    // Company
    const { data: co } = await admin
      .from("companies")
      .insert({
        workspace_id: workspaceId,
        canonical_name: `${label}Corp`,
        normalized_name: `${label.toLowerCase()}corp`,
        primary_domain: `${label.toLowerCase()}corp.com`,
        country_code: "US",
      })
      .select()
      .single();

    // Project-company link
    await admin.from("project_companies").insert({
      workspace_id: workspaceId,
      project_id: projectId,
      company_id: co!.id,
      fit_score: 85,
      qualification_reasons: ["ICP match"],
      disqualification_reasons: [],
    });

    // Decision role run
    const { data: drr } = await admin
      .from("decision_role_runs")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        company_id: co!.id,
        status: "succeeded",
        started_by: userId,
        source_product_analysis_run_id: pa!.id,
        source_market_analysis_run_id: ma!.id,
        source_icp_profile_id: icp!.id,
        provider: "mock",
      })
      .select()
      .single();

    // Primary role
    const { data: primary } = await admin
      .from("company_decision_roles")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        company_id: co!.id,
        source_run_id: drr!.id,
        role_key: "cto",
        role_title: "CTO",
        role_family: "Engineering",
        department: "Technology",
        buying_role: "decision_maker",
        status: "approved",
        is_primary: true,
        fit_score: 90,
        confidence_score: 85,
        reasoning: "E2E Primary",
        company_size_relevance: "High",
        country_relevance: "High",
      })
      .select()
      .single();

    // Secondary role
    const { data: secondary } = await admin
      .from("company_decision_roles")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        company_id: co!.id,
        source_run_id: drr!.id,
        role_key: "cfo",
        role_title: "CFO",
        role_family: "Finance",
        department: "Finance",
        buying_role: "influencer",
        status: "approved",
        is_secondary: true,
        fit_score: 75,
        confidence_score: 70,
        reasoning: "E2E Secondary",
        company_size_relevance: "High",
        country_relevance: "High",
      })
      .select()
      .single();

    return {
      workspaceId,
      projectId,
      projectSlug: slug,
      countryCode: "US",
      countryId: tc!.id,
      companyId: co!.id,
      primaryRoleId: primary!.id,
      secondaryRoleId: secondary!.id,
    };
  }

  const desktop = await createFixtureGraph("e2e-test@example.com", "Desktop");
  const mobile = await createFixtureGraph("e2e-test-mobile@example.com", "Mobile");

  return { desktop, mobile };
}
