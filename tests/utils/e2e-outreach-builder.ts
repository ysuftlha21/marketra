import { SupabaseClient } from "@supabase/supabase-js";

export async function buildE2eOutreachState(
  supabase: SupabaseClient,
  workspaceId: string,
  prefix: string,
  userId: string,
) {
  // 1. Create Project
  const projectSlug = `${prefix.toLowerCase()}-project-${Date.now()}`;
  const { data: proj, error: projErr } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      name: `${prefix} Project`,
      slug: projectSlug,
      status: "active",
      product_description: "Deterministic E2E Project",
    })
    .select()
    .single();

  if (projErr || !proj) throw new Error(`Failed to create project: ${projErr?.message}`);
  const projectId = proj.id;

  // 2. Target Country
  const { data: tc, error: tcErr } = await supabase
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

  if (tcErr || !tc) throw new Error(`Failed to create target country: ${tcErr?.message}`);
  const tcId = tc.id;

  // 3. Verified Company
  const domain = `${prefix.toLowerCase()}-corp.com`;
  const { data: co, error: coErr } = await supabase
    .from("companies")
    .insert({
      workspace_id: workspaceId,
      canonical_name: `${prefix} Corp`,
      normalized_name: `${prefix.toLowerCase()}corp`,
      primary_domain: domain,
      country_code: "US",
    })
    .select()
    .single();

  if (coErr || !co) throw new Error(`Failed to create company: ${coErr?.message}`);
  const companyId = co.id;

  // Link company to project
  // First, create a mock discovery run
  const { data: discoveryRun, error: runErr } = await supabase
    .from("company_discovery_runs")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      target_country_id: tcId,
      provider: "mock",
      provider_version: "1",
      status: "completed",
      input_snapshot: {},
      criteria_snapshot: {},
      result_summary: {},
      created_by: userId,
    })
    .select()
    .single();
  if (runErr || !discoveryRun)
    throw new Error(`Failed to create discovery run: ${runErr?.message}`);

  const { error: pcErr } = await supabase.from("project_companies").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    target_country_id: tcId,
    company_id: companyId,
    discovery_run_id: discoveryRun.id,
    status: "approved",
  });
  if (pcErr) throw new Error(`Failed to link project company: ${pcErr.message}`);

  // 4. Completed Product Analysis
  const { data: pa, error: paErr } = await supabase
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
      output: { capabilities: ["test"], customerCategories: ["test"] },
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (paErr || !pa) throw new Error(`Failed to create paRun: ${paErr?.message}`);
  const paRunId = pa.id;

  // 5. Completed Market Analysis
  const { data: ma, error: maErr } = await supabase
    .from("market_analysis_runs")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      project_target_country_id: tcId,
      requested_by: userId,
      provider: "mock",
      status: "succeeded",
      input_snapshot: {},
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (maErr || !ma) throw new Error(`Failed to create maRun: ${maErr?.message}`);
  const maRunId = ma.id;

  // 6. Approved ICP
  const { data: icp, error: icpErr } = await supabase
    .from("icp_profiles")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      project_target_country_id: tcId,
      market_analysis_run_id: maRunId,
      product_analysis_run_id: paRunId,
      status: "approved",
      name: `${prefix} ICP`,
      summary: "Deterministic ICP",
      country_code: "US",
      created_by: userId,
    })
    .select()
    .single();

  if (icpErr || !icp) throw new Error(`Failed to create icp: ${icpErr?.message}`);
  const icpId = icp.id;

  // 7. Decision Role Run
  const { data: drr, error: drrErr } = await supabase
    .from("decision_role_runs")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      company_id: companyId,
      status: "succeeded",
      started_by: userId,
      source_product_analysis_run_id: paRunId,
      source_market_analysis_run_id: maRunId,
      source_icp_profile_id: icpId,
      provider: "mock",
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (drrErr || !drr) throw new Error(`Failed to create drr: ${drrErr?.message}`);
  const drRunId = drr.id;

  // 8. Decision Roles
  const { error: rolesErr } = await supabase.from("company_decision_roles").insert([
    {
      workspace_id: workspaceId,
      project_id: projectId,
      company_id: companyId,
      source_run_id: drRunId,
      role_key: "primary_cto",
      role_title: "Chief Technology Officer",
      role_family: "Engineering",
      department: "Technology",
      buying_role: "decision_maker",
      status: "approved",
      is_primary: true,
      is_secondary: false,
      fit_score: 95,
      confidence_score: 90,
      reasoning: "Primary tech decision maker.",
      company_size_relevance: "High",
      country_relevance: "High",
    },
    {
      workspace_id: workspaceId,
      project_id: projectId,
      company_id: companyId,
      source_run_id: drRunId,
      role_key: "secondary_ciso",
      role_title: "Chief Information Security Officer",
      role_family: "Security",
      department: "Security",
      buying_role: "influencer",
      status: "approved",
      is_primary: false,
      is_secondary: true,
      fit_score: 85,
      confidence_score: 80,
      reasoning: "Key security influencer.",
      company_size_relevance: "High",
      country_relevance: "High",
    },
    {
      workspace_id: workspaceId,
      project_id: projectId,
      company_id: companyId,
      source_run_id: drRunId,
      role_key: "suggested_cmo",
      role_title: "Chief Marketing Officer",
      role_family: "Marketing",
      department: "Marketing",
      buying_role: "decision_maker",
      status: "suggested",
      is_primary: false,
      is_secondary: false,
      fit_score: 70,
      confidence_score: 65,
      reasoning: "Suggested for marketing perspective.",
      company_size_relevance: "Medium",
      country_relevance: "Medium",
    },
    {
      workspace_id: workspaceId,
      project_id: projectId,
      company_id: companyId,
      source_run_id: drRunId,
      role_key: "rejected_intern",
      role_title: "Engineering Intern",
      role_family: "Engineering",
      department: "Technology",
      buying_role: "none",
      status: "rejected",
      is_primary: false,
      is_secondary: false,
      fit_score: 20,
      confidence_score: 95,
      reasoning: "No buying power.",
      company_size_relevance: "Low",
      country_relevance: "Low",
    },
  ]);

  if (rolesErr) throw new Error(`Failed to create roles: ${rolesErr.message}`);
}
