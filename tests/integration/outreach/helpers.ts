import { createServiceRoleClient } from "@/lib/db/supabase-service";

export interface OutreachContext {
  wsId: string;
  otherWsId: string;
  pId: string;
  projectSlug: string;
  companyId: string;
  paRunId: string;
  maRunId: string;
  icpId: string;
  tcId: string;
  drRunId: string;
  primaryDrId: string;
  secondaryDrId: string;
  suggestedDrId: string;
  rejectedDrId: string;
  ownerUserId: string;
  outsiderUserId: string;
  ownerEmail: string;
  outsiderEmail: string;
}

function uid(label: string): string {
  return `${label}-${Math.random().toString(36).substring(2, 8)}`;
}

export async function buildOutreachIntegrationContext(prefix: string): Promise<OutreachContext> {
  const admin = createServiceRoleClient();

  // Create owner
  const ownerEmail = `${prefix}-${uid("o")}@example.com`;
  const { data: owner } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: "Pass123!",
    email_confirm: true,
  });
  if (!owner.user) throw new Error("no owner");
  const ownerUserId = owner.user.id;
  await admin
    .from("profiles")
    .insert({ id: ownerUserId, email: ownerEmail, display_name: ownerEmail })
    .maybeSingle();
  await admin.from("user_preferences").insert({ user_id: ownerUserId }).maybeSingle();

  // Create workspaces
  const { data: ws } = await admin
    .from("workspaces")
    .insert({ name: `${prefix} WS`, slug: uid(`${prefix}-ws`), created_by: ownerUserId })
    .select()
    .single();
  const wsId = ws!.id;
  await admin
    .from("workspace_members")
    .insert({ workspace_id: wsId, user_id: ownerUserId, role: "owner" });

  const { data: ows } = await admin
    .from("workspaces")
    .insert({ name: `${prefix} Other`, slug: uid(`${prefix}-ow`), created_by: ownerUserId })
    .select()
    .single();
  const otherWsId = ows!.id;

  // Create outsider
  const outsiderEmail = `${prefix}-${uid("x")}@example.com`;
  const { data: outsider } = await admin.auth.admin.createUser({
    email: outsiderEmail,
    password: "Pass123!",
    email_confirm: true,
  });
  if (!outsider.user) throw new Error("no outsider");
  const outsiderUserId = outsider.user.id;
  await admin
    .from("profiles")
    .insert({ id: outsiderUserId, email: outsiderEmail, display_name: outsiderEmail })
    .maybeSingle();
  await admin.from("user_preferences").insert({ user_id: outsiderUserId }).maybeSingle();

  // Create project
  const projectSlug = uid(`${prefix}-proj`);
  const { data: proj } = await admin
    .from("projects")
    .insert({
      workspace_id: wsId,
      created_by: ownerUserId,
      name: `${prefix} Proj`,
      slug: projectSlug,
      status: "active",
      product_description: "test project description for outreach testing",
    })
    .select()
    .single();
  const pId = proj!.id;

  // Create target country
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
  const tcId = tc!.id;

  // Create company
  const { data: co } = await admin
    .from("companies")
    .insert({
      workspace_id: wsId,
      canonical_name: `${prefix}Corp`,
      normalized_name: `${prefix}corp`,
      primary_domain: `${prefix}corp.com`,
      country_code: "US",
    })
    .select()
    .single();
  const companyId = co!.id;

  // Create product analysis
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
      output: { capabilities: [], customerCategories: [] },
    })
    .select()
    .single();
  const paRunId = pa!.id;

  // Create market analysis
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
  const maRunId = ma!.id;

  // Create ICP
  const { data: icp } = await admin
    .from("icp_profiles")
    .insert({
      workspace_id: wsId,
      project_id: pId,
      project_target_country_id: tcId,
      market_analysis_run_id: maRunId,
      product_analysis_run_id: paRunId,
      status: "approved",
      name: `${prefix} ICP`,
      summary: "ICP",
      country_code: "US",
      created_by: ownerUserId,
    })
    .select()
    .single();
  const icpId = icp!.id;

  // Create Decision Role Run
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
  const drRunId = drr!.id;

  // Create Roles
  const { data: primary } = await admin
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
      reasoning: "Primary",
      company_size_relevance: "High",
      country_relevance: "High",
    })
    .select()
    .single();
  const primaryDrId = primary!.id;

  const { data: secondary } = await admin
    .from("company_decision_roles")
    .insert({
      workspace_id: wsId,
      project_id: pId,
      company_id: companyId,
      source_run_id: drRunId,
      role_key: "cfo",
      role_title: "CFO",
      role_family: "Finance",
      department: "Finance",
      buying_role: "influencer",
      status: "approved",
      is_secondary: true,
      fit_score: 75,
      confidence_score: 70,
      reasoning: "Secondary",
      company_size_relevance: "High",
      country_relevance: "High",
    })
    .select()
    .single();
  const secondaryDrId = secondary!.id;

  const { data: suggested } = await admin
    .from("company_decision_roles")
    .insert({
      workspace_id: wsId,
      project_id: pId,
      company_id: companyId,
      source_run_id: drRunId,
      role_key: "cmo",
      role_title: "CMO",
      role_family: "Marketing",
      department: "Marketing",
      buying_role: "influencer",
      status: "suggested",
      fit_score: 60,
      confidence_score: 55,
      reasoning: "Suggested",
      company_size_relevance: "Medium",
      country_relevance: "Medium",
    })
    .select()
    .single();
  const suggestedDrId = suggested!.id;

  const { data: rejected } = await admin
    .from("company_decision_roles")
    .insert({
      workspace_id: wsId,
      project_id: pId,
      company_id: companyId,
      source_run_id: drRunId,
      role_key: "coo",
      role_title: "COO",
      role_family: "Operations",
      department: "Operations",
      buying_role: "decision_maker",
      status: "rejected",
      fit_score: 30,
      confidence_score: 25,
      reasoning: "Rejected",
      company_size_relevance: "Low",
      country_relevance: "Low",
    })
    .select()
    .single();
  const rejectedDrId = rejected!.id;

  return {
    wsId,
    otherWsId,
    pId,
    projectSlug,
    companyId,
    paRunId,
    maRunId,
    icpId,
    tcId,
    drRunId,
    primaryDrId,
    secondaryDrId,
    suggestedDrId,
    rejectedDrId,
    ownerUserId,
    outsiderUserId,
    ownerEmail,
    outsiderEmail,
  };
}

export async function cleanupOutreachIntegrationContext(ctx: OutreachContext) {
  const admin = createServiceRoleClient();
  await admin.from("outreach_draft_versions").delete().eq("workspace_id", ctx.wsId);
  await admin.from("outreach_drafts").delete().eq("workspace_id", ctx.wsId);
  await admin.from("outreach_generation_runs").delete().eq("workspace_id", ctx.wsId);
  await admin.from("company_decision_roles").delete().eq("workspace_id", ctx.wsId);
  await admin.from("decision_role_runs").delete().eq("workspace_id", ctx.wsId);
  await admin.from("icp_profiles").delete().eq("workspace_id", ctx.wsId);
  await admin.from("market_analysis_runs").delete().eq("workspace_id", ctx.wsId);
  await admin.from("product_analysis_runs").delete().eq("workspace_id", ctx.wsId);
  await admin.from("companies").delete().eq("workspace_id", ctx.wsId);
  await admin.from("project_target_countries").delete().eq("workspace_id", ctx.wsId);
  await admin.from("projects").delete().eq("workspace_id", ctx.wsId);
  await admin.from("workspace_members").delete().eq("workspace_id", ctx.wsId);
  await admin.from("workspaces").delete().eq("id", ctx.wsId);
  await admin.from("workspaces").delete().eq("id", ctx.otherWsId);

  if (ctx.ownerUserId) await admin.auth.admin.deleteUser(ctx.ownerUserId).catch(() => {});
  if (ctx.outsiderUserId) await admin.auth.admin.deleteUser(ctx.outsiderUserId).catch(() => {});
}
