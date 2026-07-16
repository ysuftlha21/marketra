import { createOutreachProvider } from "@/lib/providers/outreach/outreach.factory";
import { parseServerEnv } from "@/lib/env/env";
import { getProjectService } from "@/features/projects/services/project-service";
import {
  getTargetCountry,
  getLatestMarketAnalysisRun,
} from "@/features/markets/repository/market-repository";
import { getLatestIcpProfile } from "@/features/icp/repository/icp-repository";
import { getLatestAnalysisRun } from "@/features/projects/repository/project-repository";
import { toProductIntelligenceContext } from "@/features/projects/domain/product-intelligence";
import { consumeOutreachGeneration } from "@/features/workspaces/services/workspace-usage-service";
import { resolveWorkspacePlan } from "@/features/workspaces/services/workspace-plan-service";
import { getCompanyDecisionRoles } from "@/features/companies/repository/decision-role-repository";
import { getProjectCompanyOutreachContext } from "@/features/companies/repository/company-repository";
import type {
  OutreachGenerationInput,
  OutreachRequest,
} from "@/lib/providers/outreach/outreach.provider";
import type { Json } from "@/lib/db/database.types";
import {
  createOutreachRun,
  updateOutreachRun,
  getOutreachRun,
  findActiveOutreachRun,
  createOutreachDraft,
  createOutreachDraftVersion,
} from "../repository/outreach-repository";
import {
  OutreachError,
  mapOutreachExecutionError,
  safeOutreachError,
} from "../domain/outreach-errors";

export async function startOutreachGeneration(
  workspaceId: string,
  projectSlug: string,
  targetCountryId: string,
  companyId: string,
  decisionRoleId: string,
  userId: string,
  request: OutreachRequest,
  idempotencyOverride?: string,
): Promise<{ runId: string }> {
  const env = parseServerEnv();
  const { plan } = await resolveWorkspacePlan(workspaceId);
  const project = await getProjectService(projectSlug);
  if (!project) throw new OutreachError("project_not_found");

  const targetCountry = await getTargetCountry(workspaceId, targetCountryId);
  if (!targetCountry || targetCountry.project_id !== project.id) {
    throw new OutreachError("country_not_found");
  }

  const companyContext = await getProjectCompanyOutreachContext(
    workspaceId,
    project.id,
    targetCountryId,
    companyId,
  );
  if (!companyContext) throw new OutreachError("company_not_found");

  const roles = await getCompanyDecisionRoles(workspaceId, companyId);
  const role = roles.find((candidate) => {
    return candidate.id === decisionRoleId && candidate.project_id === project.id;
  });
  if (!role) throw new OutreachError("decision_role_not_found");
  if (role.status !== "approved") throw new OutreachError("decision_role_not_approved");

  const productAnalysisRun = await getLatestAnalysisRun(project.id);
  if (
    !productAnalysisRun ||
    productAnalysisRun.status !== "succeeded" ||
    !productAnalysisRun.output
  ) {
    throw new OutreachError("product_analysis_missing");
  }
  const productContext = toProductIntelligenceContext(
    productAnalysisRun.output as Record<string, unknown>,
  );

  const icp = await getLatestIcpProfile(workspaceId, targetCountryId);
  if (!icp || icp.status !== "approved") throw new OutreachError("icp_not_approved");

  const activeRun = await findActiveOutreachRun(
    workspaceId,
    project.id,
    companyId,
    decisionRoleId,
    request.channel,
    request.messageType,
  );
  if (activeRun) throw new OutreachError("already_running");

  const marketRun = await getLatestMarketAnalysisRun(project.id, targetCountryId);
  const idempotencyKey =
    idempotencyOverride ||
    `og_${workspaceId}_${companyId}_${decisionRoleId}_${Date.now().toString()}`;

  const providerInput: OutreachGenerationInput = {
    correlationId: `og_${companyId}_${decisionRoleId}`,
    schemaVersion: "1.0.0",
    workspaceContext: { workspaceId, workspaceName: "" },
    productContext: {
      productName: project.name,
      productDescription: project.product_description,
      capabilities: productContext.capabilities ?? [],
      targetCustomerSummary: String(productContext.customerCategories?.join(", ") || ""),
    },
    marketContext:
      marketRun?.status === "succeeded"
        ? {
            countryCode: targetCountry.country_code,
            countryName: targetCountry.country_name,
            opportunities: [],
            risks: [],
          }
        : undefined,
    icpContext: {
      industries: ((icp.industry_segments as Record<string, unknown>)?.segments as string[]) || [],
      companySizes: ((icp.company_attributes as Record<string, unknown>)?.sizes as string[]) || [],
      buyerRoles:
        (icp.buyer_roles as unknown[])?.map((buyerRole) =>
          typeof buyerRole === "object" && buyerRole !== null
            ? String((buyerRole as Record<string, unknown>).title || "")
            : String(buyerRole),
        ) || [],
      pains: (icp.pains as unknown[])?.map(String) || [],
      desiredOutcomes: (icp.desired_outcomes as unknown[])?.map(String) || [],
    },
    companyContext: {
      companyName: companyContext.companyName,
      industry: companyContext.industry || undefined,
      employeeCountMin: companyContext.employeeCountMin,
      employeeCountMax: companyContext.employeeCountMax,
      companySize:
        companyContext.employeeCountMin !== null || companyContext.employeeCountMax !== null
          ? `${companyContext.employeeCountMin ?? 0}-${companyContext.employeeCountMax ?? "+"}`
          : undefined,
      location: [companyContext.headquartersCity, companyContext.countryCode]
        .filter(Boolean)
        .join(", "),
      fitScore: companyContext.fitScore,
      qualificationReasons: companyContext.qualificationReasons,
      disqualificationReasons: companyContext.disqualificationReasons,
      purchaseSignals: companyContext.purchaseSignals,
      discoveryEvidence: companyContext.discoveryEvidence,
    },
    decisionRoleContext: {
      roleKey: role.role_key,
      roleTitle: role.role_title,
      roleFamily: role.role_family,
      department: role.department,
      buyingRole: role.buying_role,
      priority: role.priority as "primary" | "secondary" | "supporting" | "low",
      fitScore: role.fit_score,
      likelyPainPoints: (role.likely_pain_points as unknown as string[]) || [],
      likelyObjections: (role.likely_objections as unknown as string[]) || [],
      recommendedMessageAngles: (role.recommended_message_angles as unknown as string[]) || [],
      reasoning: role.reasoning,
    },
    outreachRequest: request,
  };

  const provider = createOutreachProvider(env.DEFAULT_OUTREACH_PROVIDER);
  const inputSnapshot = {
    project: { id: project.id, name: project.name },
    country: {
      id: targetCountry.id,
      code: targetCountry.country_code,
      name: targetCountry.country_name,
    },
    company: {
      id: companyId,
      name: companyContext.companyName,
      projectCompanyId: companyContext.projectCompanyId,
      context: providerInput.companyContext,
    },
    role: {
      id: role.id,
      roleKey: role.role_key,
      roleTitle: role.role_title,
      roleFamily: role.role_family,
      buyingRole: role.buying_role,
      priority: role.priority,
    },
    request,
    schemaVersion: "1.0.0",
    promptVersion: "1.0.0",
    providerVersion: provider.version,
    idempotencyKey,
  };

  let run;
  try {
    run = await createOutreachRun(workspaceId, {
      workspace_id: workspaceId,
      project_id: project.id,
      company_id: companyId,
      decision_role_id: decisionRoleId,
      source_decision_role_run_id: role.source_run_id,
      source_product_analysis_run_id: productAnalysisRun.id,
      source_market_analysis_run_id: marketRun?.status === "succeeded" ? marketRun.id : null,
      source_icp_profile_id: icp.id,
      source_discovery_run_id: companyContext.discoveryRunId,
      channel: request.channel,
      message_type: request.messageType,
      provider: provider.id,
      provider_version: provider.version,
      status: "pending",
      current_stage: "queued",
      input_snapshot: inputSnapshot as unknown as Json,
      idempotency_key: idempotencyKey,
      started_by: userId,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "ACTIVE_RUN_EXISTS") {
      throw new OutreachError("already_running");
    }
    throw error;
  }

  try {
    await consumeOutreachGeneration(workspaceId, idempotencyKey, plan);
  } catch (error: unknown) {
    const errorCode =
      error instanceof Error && error.message.includes("limit reached")
        ? "usage_limit_reached"
        : "persistence_failure";
    await updateOutreachRun(workspaceId, run.id, {
      status: "failed",
      current_stage: "queued",
      error_code: errorCode,
      safe_error_message: safeOutreachError(errorCode),
      completed_at: new Date().toISOString(),
    });
    logOutreachDiagnostic("Outreach usage reservation failed", run.id, errorCode, error);
    throw new OutreachError(errorCode);
  }

  // Phase 8.2 uses only the deterministic Mock provider. With no durable worker
  // architecture in the repository, execution is intentionally synchronous so
  // serverless response completion cannot terminate draft persistence.
  await executeOutreachGeneration(workspaceId, run.id, providerInput, provider);
  return { runId: run.id };
}

async function executeOutreachGeneration(
  workspaceId: string,
  runId: string,
  input: OutreachGenerationInput,
  provider: ReturnType<typeof createOutreachProvider>,
) {
  try {
    await updateOutreachRun(workspaceId, runId, {
      status: "running",
      current_stage: "generating_outreach",
      started_at: new Date().toISOString(),
    });

    const providerResult = await provider.generateOutreachDraft(input);
    if (!providerResult.data) throw new OutreachError("invalid_provider_response");

    await updateOutreachRun(workspaceId, runId, { current_stage: "validating_result" });
    const result = providerResult.data;
    await updateOutreachRun(workspaceId, runId, {
      current_stage: "saving_draft",
      result_snapshot: result as unknown as Json,
    });

    const run = await getOutreachRun(workspaceId, runId);
    if (!run) throw new OutreachError("persistence_failure");

    const draft = await createOutreachDraft(workspaceId, {
      workspace_id: workspaceId,
      project_id: run.project_id,
      company_id: run.company_id,
      decision_role_id: run.decision_role_id,
      source_run_id: run.id,
      channel: result.draft.channel,
      message_type: result.draft.messageType,
      language: result.draft.language,
      subject: result.draft.subject,
      body: result.draft.body,
      call_to_action: result.draft.callToAction,
      tone: result.draft.tone,
      length: result.draft.length,
      status: "draft",
      source_type: "generated",
      current_version_number: 1,
      is_current: true,
      created_by: run.started_by,
    });

    await createOutreachDraftVersion(workspaceId, {
      workspace_id: workspaceId,
      project_id: run.project_id,
      company_id: run.company_id,
      outreach_draft_id: draft.id,
      version_number: 1,
      subject: result.draft.subject,
      body: result.draft.body,
      call_to_action: result.draft.callToAction,
      tone: result.draft.tone,
      length: result.draft.length,
      change_type: "generated",
      source_run_id: run.id,
      created_by: run.started_by,
    });

    await updateOutreachRun(workspaceId, runId, {
      status: "succeeded",
      current_stage: "complete",
      completed_at: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorCode = mapOutreachExecutionError(error);
    logOutreachDiagnostic("Outreach generation failed", runId, errorCode, error);
    await updateOutreachRun(workspaceId, runId, {
      status: "failed",
      current_stage: "generating_outreach",
      error_code: errorCode,
      safe_error_message: safeOutreachError(errorCode),
      completed_at: new Date().toISOString(),
    });
  }
}

function logOutreachDiagnostic(event: string, runId: string, errorCode: string, error: unknown) {
  console.error(event, {
    runId,
    errorCode,
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
}
