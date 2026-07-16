import type { SupabaseClient } from "@supabase/supabase-js";

type FixtureMode = "core" | "mobile" | "states";
type DraftKind = "email" | "linkedin";
type RunState = "running" | "failed";

interface GraphOptions {
  slug: string;
  name: string;
  companyName: string;
  approvedRoles?: boolean;
  draft?: DraftKind;
  runState?: RunState;
  decisionRoles?: boolean;
}

export async function ensureE2eOutreachWorkspace(
  supabase: SupabaseClient,
  userId: string,
  existingWorkspaceId: string | undefined,
  label: "Desktop" | "Mobile" | "States",
) {
  const slug = `e2e-outreach-${label.toLowerCase()}-workspace`;
  const name = `E2E Outreach ${label}`;
  if (existingWorkspaceId) {
    const { error } = await supabase
      .from("workspaces")
      .update({ name, slug })
      .eq("id", existingWorkspaceId);
    if (error) throw new Error(`Failed to reset ${label} Outreach workspace`);
    return existingWorkspaceId;
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({
      name,
      slug,
      created_by: userId,
    })
    .select()
    .single();
  if (error || !workspace) {
    throw new Error(`Failed to create ${label} Outreach workspace: ${error?.message}`);
  }
  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: "owner",
  });
  if (memberError) {
    throw new Error(`Failed to add ${label} Outreach workspace owner: ${memberError.message}`);
  }
  return workspace.id;
}

export async function buildE2eOutreachState(
  supabase: SupabaseClient,
  workspaceId: string,
  prefix: string,
  userId: string,
  mode: FixtureMode,
) {
  if (mode === "core") {
    await createGraph(supabase, workspaceId, userId, {
      slug: "e2e-outreach-desktop-empty",
      name: `${prefix} Empty`,
      companyName: "Northstar Desktop",
    });
    await createGraph(supabase, workspaceId, userId, {
      slug: "e2e-outreach-desktop-screenshot-empty",
      name: `${prefix} Screenshot Empty`,
      companyName: "Northstar Screenshot Empty",
    });
    await createGraph(supabase, workspaceId, userId, {
      slug: "e2e-outreach-desktop-email",
      name: `${prefix} Email Result`,
      companyName: "Northstar Email",
      draft: "email",
    });
    await createGraph(supabase, workspaceId, userId, {
      slug: "e2e-outreach-desktop-linkedin",
      name: `${prefix} LinkedIn Result`,
      companyName: "Northstar LinkedIn",
      draft: "linkedin",
    });
    await createGraph(supabase, workspaceId, userId, {
      slug: "e2e-outreach-desktop-linkedin-empty",
      name: `${prefix} LinkedIn Empty`,
      companyName: "Northstar LinkedIn Generation",
    });
    await createGraph(supabase, workspaceId, userId, {
      slug: "e2e-decision-roles-desktop",
      name: `${prefix} Decision Roles`,
      companyName: "Northstar Decision Roles",
      decisionRoles: false,
    });
    return;
  }

  if (mode === "mobile") {
    await createGraph(supabase, workspaceId, userId, {
      slug: "e2e-outreach-mobile-empty",
      name: `${prefix} Empty`,
      companyName: "Northstar Mobile",
    });
    await createGraph(supabase, workspaceId, userId, {
      slug: "e2e-outreach-mobile-result",
      name: `${prefix} Result`,
      companyName: "Northstar Mobile Result",
      draft: "email",
    });
    return;
  }

  await createGraph(supabase, workspaceId, userId, {
    slug: "e2e-outreach-state-progress",
    name: `${prefix} Progress`,
    companyName: "Northstar Progress",
    runState: "running",
  });
  await createGraph(supabase, workspaceId, userId, {
    slug: "e2e-outreach-state-failed",
    name: `${prefix} Failed`,
    companyName: "Northstar Failed",
    runState: "failed",
  });
  await createGraph(supabase, workspaceId, userId, {
    slug: "e2e-outreach-state-limit",
    name: `${prefix} Usage Limit`,
    companyName: "Northstar Limit",
  });
  await createGraph(supabase, workspaceId, userId, {
    slug: "e2e-outreach-state-no-role",
    name: `${prefix} No Approved Role`,
    companyName: "Northstar No Role",
    approvedRoles: false,
  });

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const { error: usageError } = await supabase.from("workspace_usage_periods").insert({
    workspace_id: workspaceId,
    metric: "outreach_generations",
    used: 10,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  });
  if (usageError) throw new Error(`Failed to seed Outreach usage limit: ${usageError.message}`);
}

async function createGraph(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  options: GraphOptions,
) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      created_by: userId,
      name: options.name,
      slug: options.slug,
      status: "active",
      product_description: "Deterministic Phase 8.2 browser verification project",
    })
    .select()
    .single();
  if (projectError || !project)
    throw new Error(`Failed to create project: ${projectError?.message}`);

  const { data: country, error: countryError } = await supabase
    .from("project_target_countries")
    .insert({
      workspace_id: workspaceId,
      project_id: project.id,
      country_code: "US",
      country_name: "United States",
      added_by: userId,
    })
    .select()
    .single();
  if (countryError || !country)
    throw new Error(`Failed to create country: ${countryError?.message}`);

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      workspace_id: workspaceId,
      canonical_name: options.companyName,
      normalized_name: options.companyName.toLowerCase().replaceAll(" ", "-"),
      primary_domain: `${options.slug}.example.com`,
      country_code: "US",
      headquarters_city: "Austin",
      industry: "Software",
      employee_count_min: 51,
      employee_count_max: 200,
      growth_signals: ["Hiring engineering leaders"],
      technology_signals: ["Cloud infrastructure"],
    })
    .select()
    .single();
  if (companyError || !company)
    throw new Error(`Failed to create company: ${companyError?.message}`);

  const { data: discoveryRun, error: discoveryError } = await supabase
    .from("company_discovery_runs")
    .insert({
      workspace_id: workspaceId,
      project_id: project.id,
      target_country_id: country.id,
      provider: "mock",
      provider_version: "1.0.0",
      status: "completed",
      input_snapshot: {},
      criteria_snapshot: {},
      result_summary: {},
      created_by: userId,
    })
    .select()
    .single();
  if (discoveryError || !discoveryRun) {
    throw new Error(`Failed to create discovery run: ${discoveryError?.message}`);
  }

  const { error: projectCompanyError } = await supabase.from("project_companies").insert({
    workspace_id: workspaceId,
    project_id: project.id,
    target_country_id: country.id,
    company_id: company.id,
    discovery_run_id: discoveryRun.id,
    status: "approved",
    fit_score: 88,
    fit_grade: "strong",
    confidence_score: 91,
    qualification_reasons: ["Strong deterministic ICP match"],
    disqualification_reasons: [],
    matched_signals: ["cloud_infrastructure", "engineering_growth"],
    missing_signals: [],
    scoring_snapshot: {},
  });
  if (projectCompanyError) {
    throw new Error(`Failed to link project company: ${projectCompanyError.message}`);
  }

  const { data: productRun, error: productError } = await supabase
    .from("product_analysis_runs")
    .insert({
      workspace_id: workspaceId,
      project_id: project.id,
      status: "succeeded",
      requested_by: userId,
      provider: "mock",
      model: "mock-model",
      prompt_version: "1.0.0",
      input_snapshot: {},
      output: {
        capabilities: ["Workflow automation"],
        customerCategories: ["B2B SaaS"],
      },
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (productError || !productRun) {
    throw new Error(`Failed to create product analysis: ${productError?.message}`);
  }

  const { data: marketRun, error: marketError } = await supabase
    .from("market_analysis_runs")
    .insert({
      workspace_id: workspaceId,
      project_id: project.id,
      project_target_country_id: country.id,
      requested_by: userId,
      provider: "mock",
      status: "succeeded",
      input_snapshot: {},
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (marketError || !marketRun) {
    throw new Error(`Failed to create market analysis: ${marketError?.message}`);
  }

  const { data: icp, error: icpError } = await supabase
    .from("icp_profiles")
    .insert({
      workspace_id: workspaceId,
      project_id: project.id,
      project_target_country_id: country.id,
      market_analysis_run_id: marketRun.id,
      product_analysis_run_id: productRun.id,
      status: "approved",
      name: `${options.name} ICP`,
      summary: "Deterministic browser-test ICP",
      country_code: "US",
      created_by: userId,
    })
    .select()
    .single();
  if (icpError || !icp) throw new Error(`Failed to create ICP: ${icpError?.message}`);

  const { data: roleRun, error: roleRunError } = await supabase
    .from("decision_role_runs")
    .insert({
      workspace_id: workspaceId,
      project_id: project.id,
      company_id: company.id,
      status: "succeeded",
      started_by: userId,
      source_product_analysis_run_id: productRun.id,
      source_market_analysis_run_id: marketRun.id,
      source_icp_profile_id: icp.id,
      provider: "mock",
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (roleRunError || !roleRun) {
    throw new Error(`Failed to create role run: ${roleRunError?.message}`);
  }

  if (options.decisionRoles === false) return;

  const approvedRoles = options.approvedRoles !== false;
  const roles = [
    rolePayload("Chief Technology Officer", "primary_cto", 95, true, false, approvedRoles),
    rolePayload(
      "Chief Information Security Officer",
      "secondary_ciso",
      85,
      false,
      true,
      approvedRoles,
    ),
    rolePayload("VP Engineering", "vp_engineering", 92, false, false, approvedRoles),
  ].map((role) => ({
    ...role,
    workspace_id: workspaceId,
    project_id: project.id,
    company_id: company.id,
    source_run_id: roleRun.id,
  }));

  const { data: insertedRoles, error: rolesError } = await supabase
    .from("company_decision_roles")
    .insert(roles)
    .select();
  if (rolesError || !insertedRoles?.[0]) {
    throw new Error(`Failed to create roles: ${rolesError?.message}`);
  }

  if (options.draft) {
    await createDraftFixture(
      supabase,
      workspaceId,
      userId,
      project.id,
      company.id,
      insertedRoles[0].id,
      roleRun.id,
      productRun.id,
      marketRun.id,
      icp.id,
      discoveryRun.id,
      options.draft,
      options.companyName,
    );
  }

  if (options.runState) {
    const failed = options.runState === "failed";
    const { error: runError } = await supabase.from("outreach_generation_runs").insert({
      workspace_id: workspaceId,
      project_id: project.id,
      company_id: company.id,
      decision_role_id: insertedRoles[0].id,
      source_decision_role_run_id: roleRun.id,
      source_product_analysis_run_id: productRun.id,
      source_market_analysis_run_id: marketRun.id,
      source_icp_profile_id: icp.id,
      source_discovery_run_id: discoveryRun.id,
      channel: "email",
      message_type: "initial_contact",
      provider: "mock",
      provider_version: "1.0.0",
      status: failed ? "failed" : "running",
      current_stage: "generating_outreach",
      idempotency_key: `${options.slug}-run`,
      started_by: userId,
      started_at: new Date().toISOString(),
      completed_at: failed ? new Date().toISOString() : null,
      error_code: failed ? "provider_unavailable" : null,
      safe_error_message: failed ? "Outreach provider unavailable." : null,
    });
    if (runError) throw new Error(`Failed to create state run: ${runError.message}`);
  }
}

function rolePayload(
  title: string,
  key: string,
  fitScore: number,
  isPrimary: boolean,
  isSecondary: boolean,
  approved: boolean,
) {
  return {
    role_key: key,
    role_title: title,
    role_family: "Engineering",
    department: "Technology",
    buying_role: "decision_maker",
    status: approved ? "approved" : "suggested",
    is_primary: isPrimary,
    is_secondary: isSecondary,
    fit_score: fitScore,
    confidence_score: 90,
    reasoning: "Deterministic Phase 8.2 browser fixture",
    company_size_relevance: "High",
    country_relevance: "High",
  };
}

async function createDraftFixture(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  projectId: string,
  companyId: string,
  roleId: string,
  roleRunId: string,
  productRunId: string,
  marketRunId: string,
  icpId: string,
  discoveryRunId: string,
  kind: DraftKind,
  companyName: string,
) {
  const linkedin = kind === "linkedin";
  const subject = linkedin ? null : `A practical idea for ${companyName}`;
  const body = linkedin
    ? `Hi — I noticed ${companyName} is growing its engineering organization. Open to connecting?`
    : `Hello,\n\n${companyName} appears to be scaling cloud operations. Our workflow automation platform can help the technical team reduce manual coordination.\n\nWould a short conversation next week be useful?`;
  const { data: run, error: runError } = await supabase
    .from("outreach_generation_runs")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      company_id: companyId,
      decision_role_id: roleId,
      source_decision_role_run_id: roleRunId,
      source_product_analysis_run_id: productRunId,
      source_market_analysis_run_id: marketRunId,
      source_icp_profile_id: icpId,
      source_discovery_run_id: discoveryRunId,
      channel: linkedin ? "linkedin_connection" : "email",
      message_type: linkedin ? "connection_request" : "initial_contact",
      provider: "mock",
      provider_version: "1.0.0",
      status: "succeeded",
      current_stage: "complete",
      idempotency_key: `${projectId}-${kind}`,
      started_by: userId,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      result_snapshot: {
        confidence: 92,
        personalizationSummary: {
          companyContextUsed: companyName,
          roleContextUsed: "Chief Technology Officer",
          painPointUsed: "Manual coordination",
          outreachAngleUsed: "Workflow automation",
        },
        evidenceUsed: ["Strong deterministic ICP match"],
        assumptions: [],
        warnings: [],
        missingInformation: [],
      },
    })
    .select()
    .single();
  if (runError || !run) throw new Error(`Failed to create successful run: ${runError?.message}`);

  const { data: draft, error: draftError } = await supabase
    .from("outreach_drafts")
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      company_id: companyId,
      decision_role_id: roleId,
      source_run_id: run.id,
      channel: linkedin ? "linkedin_connection" : "email",
      message_type: linkedin ? "connection_request" : "initial_contact",
      language: "en",
      subject,
      body,
      call_to_action: linkedin ? null : "Would a short conversation next week be useful?",
      tone: "professional",
      length: linkedin ? "short" : "medium",
      status: "draft",
      source_type: "generated",
      current_version_number: 1,
      is_current: true,
      created_by: userId,
    })
    .select()
    .single();
  if (draftError || !draft) throw new Error(`Failed to create draft: ${draftError?.message}`);

  const { error: versionError } = await supabase.from("outreach_draft_versions").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    company_id: companyId,
    outreach_draft_id: draft.id,
    version_number: 1,
    subject,
    body,
    call_to_action: linkedin ? null : "Would a short conversation next week be useful?",
    tone: "professional",
    length: linkedin ? "short" : "medium",
    change_type: "generated",
    source_run_id: run.id,
    created_by: userId,
  });
  if (versionError) throw new Error(`Failed to create draft version: ${versionError.message}`);
}
