import { createDecisionRoleProvider } from "@/lib/providers/decision-roles/decision-roles.factory";
import { parseServerEnv } from "@/lib/env/env";
import { getProjectService } from "@/features/projects/services/project-service";
import {
  getTargetCountry,
  getLatestMarketAnalysisRun,
} from "@/features/markets/repository/market-repository";
import { getLatestIcpProfile } from "@/features/icp/repository/icp-repository";
import { listProjectCompanies } from "../repository/company-repository";
import { getLatestAnalysisRun } from "@/features/projects/repository/project-repository";
import { toProductIntelligenceContext } from "@/features/projects/domain/product-intelligence";
import { consumeDecisionRoleGeneration } from "@/features/workspaces/services/workspace-usage-service";
import { getPlan } from "@/config/plans";
import {
  createDecisionRoleRun,
  updateDecisionRoleRun,
  findLatestDecisionRoleRun,
  getDecisionRoleRun,
  createCompanyDecisionRole,
} from "../repository/decision-role-repository";
import type { DecisionRoleGenerationInput } from "@/lib/providers/decision-roles/decision-roles.provider";

export interface DecisionRoleInputSnapshot {
  project: { name: string };
  country: { code: string };
  productContext: ReturnType<typeof toProductIntelligenceContext>;
  icp: {
    buyerRoles: string[];
    pains: string[];
    outcomes: string[];
  };
  company: {
    name: string;
    industry: string | null;
    employeeCountMin: number | null;
    employeeCountMax: number | null;
    fitScore: number;
    qualificationReasons: string[];
    disqualificationReasons: string[];
  };
  requestedLanguage: string;
}

export type DecisionRoleErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "project_not_found"
  | "country_not_found"
  | "company_not_found"
  | "product_analysis_missing"
  | "icp_not_approved"
  | "already_running"
  | "provider_unavailable"
  | "provider_timeout"
  | "usage_limit_reached"
  | "persistence_failure";

export class DecisionRoleError extends Error {
  readonly code: DecisionRoleErrorCode;
  constructor(c: DecisionRoleErrorCode, m: string) {
    super(m);
    this.name = "DecisionRoleError";
    this.code = c;
  }
}

export function safeDecisionRoleError(code: DecisionRoleErrorCode): string {
  const m: Record<DecisionRoleErrorCode, string> = {
    unauthenticated: "Sign in to generate roles.",
    unauthorized: "No permission.",
    project_not_found: "Project not found.",
    country_not_found: "Target country not found.",
    company_not_found: "Company not found.",
    product_analysis_missing: "A completed product analysis is required.",
    icp_not_approved: "An approved ICP is required for this country.",
    already_running: "Generation is already in progress for this company.",
    provider_unavailable: "AI provider unavailable.",
    provider_timeout: "Generation timed out.",
    usage_limit_reached: "Usage limit reached for this billing period.",
    persistence_failure: "Save failed.",
  };
  return m[code];
}

export async function startDecisionRoleGeneration(
  wsId: string,
  projectSlug: string,
  targetCountryId: string,
  companyId: string,
  userId: string,
  idempotencyOverride?: string,
): Promise<{ runId: string }> {
  const env = parseServerEnv();
  const plan = getPlan("free")!;
  if (!plan) throw new Error("Invalid plan");

  // Load project
  const project = await getProjectService(projectSlug);
  if (!project)
    throw new DecisionRoleError("project_not_found", safeDecisionRoleError("project_not_found"));

  // Verify company and discovery
  const { items: allPcs } = await listProjectCompanies(wsId, project.id, { targetCountryId });
  const pc = allPcs.find((c) => c.company_id === companyId);
  if (!pc)
    throw new DecisionRoleError("company_not_found", safeDecisionRoleError("company_not_found"));

  const tc = await getTargetCountry(wsId, targetCountryId);
  if (!tc)
    throw new DecisionRoleError("country_not_found", safeDecisionRoleError("country_not_found"));

  // Load Product Analysis
  const paRun = await getLatestAnalysisRun(project.id);
  if (!paRun || paRun.status !== "succeeded" || !paRun.output) {
    throw new DecisionRoleError(
      "product_analysis_missing",
      safeDecisionRoleError("product_analysis_missing"),
    );
  }
  const productContext = toProductIntelligenceContext(paRun.output as Record<string, unknown>);

  // Load ICP
  const icp = await getLatestIcpProfile(wsId, targetCountryId);
  if (!icp || icp.status !== "approved") {
    throw new DecisionRoleError("icp_not_approved", safeDecisionRoleError("icp_not_approved"));
  }

  // Active run check (service layer friendly error)
  const activeRun = await findLatestDecisionRoleRun(wsId, companyId);
  if (activeRun && (activeRun.status === "pending" || activeRun.status === "running")) {
    throw new DecisionRoleError("already_running", safeDecisionRoleError("already_running"));
  }

  // Load optional Market context
  const marketRun = await getLatestMarketAnalysisRun(project.id, targetCountryId);

  // Check usage and consume (Atomic)
  const idempotencyKey = idempotencyOverride || `dr_gen_${wsId}_${companyId}_${Date.now()}`;
  try {
    await consumeDecisionRoleGeneration(wsId, idempotencyKey, plan);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("limit reached")) {
      throw new DecisionRoleError(
        "usage_limit_reached",
        safeDecisionRoleError("usage_limit_reached"),
      );
    }
    throw e;
  }

  // Construct input snapshot
  const inputSnapshot: DecisionRoleInputSnapshot = {
    project: { name: project.name },
    country: { code: tc.country_code },
    productContext,
    icp: {
      buyerRoles: (icp.buyer_roles as unknown as string[]) || [],
      pains: (icp.pains as unknown as string[]) || [],
      outcomes: (icp.desired_outcomes as unknown as string[]) || [],
    },
    company: {
      name: pc.company_name,
      industry: pc.company_industry,
      employeeCountMin: pc.company_employee_min,
      employeeCountMax: pc.company_employee_max,
      fitScore: pc.fit_score,
      qualificationReasons: pc.qualification_reasons,
      disqualificationReasons: pc.disqualification_reasons,
    },
    requestedLanguage: "en",
  };

  const provider = createDecisionRoleProvider(env.DEFAULT_COMPANY_DISCOVERY_PROVIDER || "mock");

  // Create immutable run
  let run;
  try {
    run = await createDecisionRoleRun(wsId, {
      workspace_id: wsId,
      project_id: project.id,
      company_id: companyId,
      source_product_analysis_run_id: paRun.id,
      source_market_analysis_run_id: marketRun?.status === "succeeded" ? marketRun.id : null,
      source_icp_profile_id: icp.id,
      source_discovery_run_id: null,
      provider: provider.id,
      provider_version: provider.version,
      status: "pending",
      current_stage: "queued",
      input_snapshot: inputSnapshot as unknown as import("@/lib/db/database.types").Json,
      started_by: userId,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "ACTIVE_RUN_EXISTS") {
      throw new DecisionRoleError("already_running", safeDecisionRoleError("already_running"));
    }
    throw e;
  }

  // Start background execution
  executeDecisionRoleGeneration(wsId, run.id, inputSnapshot, provider).catch(console.error);

  return { runId: run.id };
}

async function executeDecisionRoleGeneration(
  wsId: string,
  runId: string,
  snapshot: DecisionRoleInputSnapshot,
  provider: ReturnType<typeof createDecisionRoleProvider>,
) {
  let providerRes: { data: { recommendedRoles: Array<Record<string, unknown>> } } | null = null;
  let isTimeout = false;

  try {
    await updateDecisionRoleRun(wsId, runId, {
      status: "running",
      current_stage: "generating_roles",
      started_at: new Date().toISOString(),
    });

    const input: DecisionRoleGenerationInput = {
      correlationId: `dr_${runId}`,
      productContext: snapshot.productContext,
      targetCountryCode: snapshot.country.code,
      icpBuyerRoles: snapshot.icp.buyerRoles,
      icpPains: snapshot.icp.pains,
      icpOutcomes: snapshot.icp.outcomes,
      companyName: snapshot.company.name,
      companyIndustry: snapshot.company.industry || "",
      companyEmployeeMin: snapshot.company.employeeCountMin,
      companyEmployeeMax: snapshot.company.employeeCountMax,
      companySignals: snapshot.company.qualificationReasons,
      companyDisqualifiers: snapshot.company.disqualificationReasons,
      companyFitScore: snapshot.company.fitScore,
      requestedLanguage: snapshot.requestedLanguage,
    };

    providerRes = (await provider.generateRoles(input)) as {
      data: { recommendedRoles: Array<Record<string, unknown>> };
    };
    await updateDecisionRoleRun(wsId, runId, {
      current_stage: "saving_roles",
      result_snapshot: providerRes.data as unknown as import("@/lib/db/database.types").Json,
    });

    const roles = providerRes.data.recommendedRoles;

    // Wait, I need project_id for roles. Let's fetch the run.
    const run = await getDecisionRoleRun(wsId, runId);
    if (!run) return;

    for (const r of roles) {
      await createCompanyDecisionRole(wsId, {
        workspace_id: wsId,
        project_id: run.project_id,
        company_id: run.company_id,
        source_run_id: run.id,
        source_type: "generated",
        role_key: String(r.roleKey),
        role_title: String(r.roleTitle),
        role_family: String(r.roleFamily),
        department: String(r.department),
        buying_role: String(r.buyingRole),
        priority: String(r.priority),
        fit_score: Number(r.fitScore),
        confidence_score: Number(r.confidenceScore),
        reasoning: String(r.reasoning),
        evidence: r.evidence as unknown as import("@/lib/db/database.types").Json,
        likely_pain_points: (r.likelyPainPoints as string[]) || [],
        likely_objections: (r.likelyObjections as string[]) || [],
        recommended_message_angles: (r.recommendedMessageAngles as string[]) || [],
        title_variants: (r.titleVariants as string[]) || [],
        seniority_levels: (r.seniorityLevels as string[]) || [],
        company_size_relevance: String(r.companySizeRelevance || ""),
        country_relevance: String(r.countryRelevance || ""),
        status: "suggested",
        is_primary: false,
        is_secondary: false,
      });
    }

    await updateDecisionRoleRun(wsId, runId, {
      status: "succeeded",
      current_stage: "complete",
      result_snapshot: providerRes as unknown as import("@/lib/db/database.types").Json,
      completed_at: new Date().toISOString(),
    });
  } catch (e: unknown) {
    console.error("Decision Role Generation Error", e);
    isTimeout = e instanceof Error && !!e.message?.includes("timeout");
    await updateDecisionRoleRun(wsId, runId, {
      status: "failed",
      current_stage: "generating_roles",
      error_code: isTimeout ? "provider_timeout" : "persistence_failure",
      safe_error_message: e instanceof Error ? e.message : "Unknown error during role generation",
      result_snapshot: providerRes as unknown as import("@/lib/db/database.types").Json,
      completed_at: new Date().toISOString(),
    });
  }
}

export async function retryDecisionRoleGeneration(
  wsId: string,
  projectSlug: string,
  targetCountryId: string,
  runId: string,
  userId: string,
): Promise<{ runId: string }> {
  const oldRun = await getDecisionRoleRun(wsId, runId);
  if (!oldRun) throw new DecisionRoleError("persistence_failure", "Run not found");

  // Get plan and consume usage
  const plan = getPlan("free")!;
  await consumeDecisionRoleGeneration(wsId, `dr_gen_retry_\${oldRun.id}`, plan);

  // Mark old as cancelled
  await updateDecisionRoleRun(wsId, oldRun.id, {
    status: "cancelled",
    error_code: "superseded",
  });

  // Start new run
  return startDecisionRoleGeneration(
    wsId,
    projectSlug,
    targetCountryId,
    oldRun.company_id,
    userId,
    `dr_gen_retry_${oldRun.id}`,
  );
}
