import { createOutreachProvider } from "@/lib/providers/outreach/outreach.factory";
import { parseServerEnv } from "@/lib/env/env";
import { getProjectService } from "@/features/projects/services/project-service";
import { getTargetCountry } from "@/features/markets/repository/market-repository";
import { getLatestMarketAnalysisRun } from "@/features/markets/repository/market-repository";
import { getLatestIcpProfile } from "@/features/icp/repository/icp-repository";
import { getLatestAnalysisRun } from "@/features/projects/repository/project-repository";
import { toProductIntelligenceContext } from "@/features/projects/domain/product-intelligence";
import { consumeOutreachGeneration } from "@/features/workspaces/services/workspace-usage-service";
import { getPlan } from "@/config/plans";
import {
  createOutreachRun,
  updateOutreachRun,
  getOutreachRun,
  findActiveOutreachRun,
  createOutreachDraft,
  createOutreachDraftVersion,
} from "../repository/outreach-repository";
import { getCompanyDecisionRoles } from "@/features/companies/repository/decision-role-repository";
import type { OutreachGenerationInput } from "@/lib/providers/outreach/outreach.provider";
import type { Json } from "@/lib/db/database.types";

export type OutreachErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "project_not_found"
  | "country_not_found"
  | "company_not_found"
  | "decision_role_not_found"
  | "decision_role_not_approved"
  | "product_analysis_missing"
  | "icp_not_approved"
  | "already_running"
  | "provider_unavailable"
  | "provider_timeout"
  | "usage_limit_reached"
  | "persistence_failure";

export class OutreachError extends Error {
  readonly code: OutreachErrorCode;
  constructor(c: OutreachErrorCode, m: string) {
    super(m);
    this.name = "OutreachError";
    this.code = c;
  }
}

export function safeOutreachError(code: OutreachErrorCode): string {
  const m: Record<OutreachErrorCode, string> = {
    unauthenticated: "Sign in to generate outreach.",
    unauthorized: "No permission.",
    project_not_found: "Project not found.",
    country_not_found: "Target country not found.",
    company_not_found: "Company not found.",
    decision_role_not_found: "Decision role not found.",
    decision_role_not_approved: "An approved decision role is required.",
    product_analysis_missing: "A completed product analysis is required.",
    icp_not_approved: "An approved ICP is required.",
    already_running: "Outreach generation is already in progress for this role and channel.",
    provider_unavailable: "AI provider unavailable.",
    provider_timeout: "Generation timed out.",
    usage_limit_reached: "Usage limit reached for this billing period.",
    persistence_failure: "Save failed.",
  };
  return m[code];
}

export async function startOutreachGeneration(
  wsId: string,
  projectSlug: string,
  targetCountryId: string,
  companyId: string,
  decisionRoleId: string,
  userId: string,
  channel: string,
  messageType: string,
  language: string,
  objective: string,
  tone = "professional",
  length = "medium",
  instructions?: string,
  idempotencyOverride?: string,
): Promise<{ runId: string }> {
  const env = parseServerEnv();
  const plan = getPlan("free")!;

  // Load project
  const project = await getProjectService(projectSlug);
  if (!project)
    throw new OutreachError("project_not_found", safeOutreachError("project_not_found"));

  // Load target country
  const tc = await getTargetCountry(wsId, targetCountryId);
  if (!tc) throw new OutreachError("country_not_found", safeOutreachError("country_not_found"));

  // Load decision role
  const roles = await getCompanyDecisionRoles(wsId, companyId);
  const role = roles.find((r) => r.id === decisionRoleId && r.project_id === project.id);
  if (!role) {
    throw new OutreachError(
      "decision_role_not_found",
      safeOutreachError("decision_role_not_found"),
    );
  }
  if (role.status !== "approved") {
    throw new OutreachError(
      "decision_role_not_approved",
      safeOutreachError("decision_role_not_approved"),
    );
  }

  // Load Product Analysis
  const paRun = await getLatestAnalysisRun(project.id);
  if (!paRun || paRun.status !== "succeeded" || !paRun.output) {
    throw new OutreachError(
      "product_analysis_missing",
      safeOutreachError("product_analysis_missing"),
    );
  }
  const productContext = toProductIntelligenceContext(paRun.output as Record<string, unknown>);

  // Load ICP
  const icp = await getLatestIcpProfile(wsId, targetCountryId);
  if (!icp || icp.status !== "approved") {
    throw new OutreachError("icp_not_approved", safeOutreachError("icp_not_approved"));
  }

  // Active run check (service layer friendly error)
  const activeRun = await findActiveOutreachRun(
    wsId,
    project.id,
    companyId,
    decisionRoleId,
    channel,
    messageType,
  );
  if (activeRun) {
    throw new OutreachError("already_running", safeOutreachError("already_running"));
  }

  // Load optional Market context
  const marketRun = await getLatestMarketAnalysisRun(project.id, targetCountryId);

  // Check usage and consume (Atomic)
  const idempotencyKey =
    idempotencyOverride || `og_${wsId}_${companyId}_${decisionRoleId}_${Date.now()}`;
  try {
    await consumeOutreachGeneration(wsId, idempotencyKey, plan);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("limit reached")) {
      throw new OutreachError("usage_limit_reached", safeOutreachError("usage_limit_reached"));
    }
    throw e;
  }

  // Construct provider input
  const providerInput: OutreachGenerationInput = {
    correlationId: `og_${companyId}_${decisionRoleId}`,
    schemaVersion: "1.0.0",
    workspaceContext: { workspaceId: wsId, workspaceName: "" },
    productContext: {
      productName: project.name,
      productDescription: project.product_description,
      capabilities: productContext.capabilities ?? [],
      targetCustomerSummary: String(productContext.customerCategories?.join(", ") || ""),
    },
    marketContext:
      marketRun?.status === "succeeded"
        ? {
            countryCode: tc.country_code,
            countryName: tc.country_name,
            opportunities: [],
            risks: [],
          }
        : undefined,
    icpContext: {
      industries: ((icp.industry_segments as Record<string, unknown>)?.segments as string[]) || [],
      companySizes: ((icp.company_attributes as Record<string, unknown>)?.sizes as string[]) || [],
      buyerRoles:
        (icp.buyer_roles as unknown[])?.map((r) =>
          typeof r === "object" && r !== null
            ? String((r as Record<string, unknown>).title || "")
            : String(r),
        ) || [],
      pains: (icp.pains as unknown[])?.map((p) => String(p)) || [],
      desiredOutcomes: (icp.desired_outcomes as unknown[])?.map((o) => String(o)) || [],
    },
    companyContext: {
      companyName: role.company_id, // placeholder — will be resolved
      industry: "",
      employeeCountMin: null,
      employeeCountMax: null,
      fitScore: role.fit_score,
      qualificationReasons: [],
      disqualificationReasons: [],
      purchaseSignals: [],
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
    outreachRequest: {
      channel: channel as OutreachGenerationInput["outreachRequest"]["channel"],
      messageType: messageType as OutreachGenerationInput["outreachRequest"]["messageType"],
      language: language as OutreachGenerationInput["outreachRequest"]["language"],
      tone: tone as OutreachGenerationInput["outreachRequest"]["tone"],
      length: length as OutreachGenerationInput["outreachRequest"]["length"],
      objective,
      optionalUserInstructions: instructions,
    },
  };

  // Build input snapshot
  const inputSnapshot = {
    project: { id: project.id, name: project.name },
    country: { id: tc.id, code: tc.country_code, name: tc.country_name },
    role: {
      id: role.id,
      roleKey: role.role_key,
      roleTitle: role.role_title,
      roleFamily: role.role_family,
      buyingRole: role.buying_role,
      priority: role.priority,
    },
    channel,
    messageType,
    language,
    objective,
    schemaVersion: "1.0.0",
    promptVersion: "1.0.0",
    providerVersion: "0.1.0",
    idempotencyKey,
  };

  const provider = createOutreachProvider(env.DEFAULT_COMPANY_DISCOVERY_PROVIDER || "mock");

  // Create immutable run
  let run;
  try {
    run = await createOutreachRun(wsId, {
      workspace_id: wsId,
      project_id: project.id,
      company_id: companyId,
      decision_role_id: decisionRoleId,
      source_decision_role_run_id: role.source_run_id,
      source_product_analysis_run_id: paRun.id,
      source_market_analysis_run_id: marketRun?.status === "succeeded" ? marketRun.id : null,
      source_icp_profile_id: icp.id,
      source_discovery_run_id: null,
      channel,
      message_type: messageType,
      provider: provider.id,
      provider_version: provider.version,
      status: "pending",
      current_stage: "queued",
      input_snapshot: inputSnapshot as unknown as Json,
      idempotency_key: idempotencyKey,
      started_by: userId,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "ACTIVE_RUN_EXISTS") {
      throw new OutreachError("already_running", safeOutreachError("already_running"));
    }
    throw e;
  }

  // Start background execution
  executeOutreachGeneration(wsId, run.id, providerInput, provider).catch(console.error);

  return { runId: run.id };
}

async function executeOutreachGeneration(
  wsId: string,
  runId: string,
  input: OutreachGenerationInput,
  provider: ReturnType<typeof createOutreachProvider>,
) {
  try {
    await updateOutreachRun(wsId, runId, {
      status: "running",
      current_stage: "generating_outreach",
      started_at: new Date().toISOString(),
    });

    const providerRes = await provider.generateOutreachDraft(input);
    if (!providerRes.data) {
      throw new Error("Provider returned no data");
    }

    await updateOutreachRun(wsId, runId, {
      current_stage: "validating_result",
    });

    const result = providerRes.data;

    await updateOutreachRun(wsId, runId, {
      current_stage: "saving_draft",
      result_snapshot: result as unknown as Json,
    });

    // Create draft
    const run = await getOutreachRun(wsId, runId);
    if (!run) return;

    const draft = await createOutreachDraft(wsId, {
      workspace_id: wsId,
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

    // Create version 1
    await createOutreachDraftVersion(wsId, {
      workspace_id: wsId,
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

    await updateOutreachRun(wsId, runId, {
      status: "succeeded",
      current_stage: "complete",
      completed_at: new Date().toISOString(),
    });
  } catch (e: unknown) {
    console.error("Outreach Generation Error", e);
    await updateOutreachRun(wsId, runId, {
      status: "failed",
      current_stage: "generating_outreach",
      error_code: "persistence_failure",
      safe_error_message:
        e instanceof Error ? e.message : "Unknown error during outreach generation",
      completed_at: new Date().toISOString(),
    });
  }
}
