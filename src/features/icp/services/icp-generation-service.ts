import { createAiProvider } from "@/lib/providers/ai/ai.factory";
import { getProjectService } from "@/features/projects/services/project-service";
import { getTargetCountry } from "@/features/markets/repository/market-repository";
import { getLatestMarketAnalysisRun } from "@/features/markets/repository/market-repository";
import { getLatestAnalysisRun as getLatestProductRun } from "@/features/projects/repository/project-repository";
import {
  createIcpGenRun,
  updateIcpGenRun,
  hasActiveIcpRun,
  createIcpProfile,
  getNextVersion,
} from "../repository/icp-repository";
import { countrySpecificIcpResultSchema } from "@/lib/providers/ai/ai.provider";
import type { CountrySpecificIcpResult } from "@/lib/providers/ai/ai.provider";
import { parseServerEnv } from "@/lib/env/env";
import { toProductIntelligenceContext } from "@/features/projects/domain/product-intelligence";

export type IcpGenErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "project_not_found"
  | "country_not_found"
  | "market_analysis_missing"
  | "product_analysis_missing"
  | "already_running"
  | "provider_unavailable"
  | "provider_timeout"
  | "invalid_provider_response"
  | "configuration_missing"
  | "persistence_failure";

export class IcpGenError extends Error {
  readonly code: IcpGenErrorCode;
  constructor(c: IcpGenErrorCode, m: string) {
    super(m);
    this.name = "IcpGenError";
    this.code = c;
  }
}

export function safeIcpError(c: IcpGenErrorCode): string {
  const m: Record<IcpGenErrorCode, string> = {
    unauthenticated: "Sign in to generate an ICP.",
    unauthorized: "No permission.",
    project_not_found: "Project not found.",
    country_not_found: "Target country not found.",
    market_analysis_missing: "Run a market analysis first.",
    product_analysis_missing: "Run a product analysis first.",
    already_running: "An ICP is already being generated.",
    provider_unavailable: "AI provider unavailable.",
    provider_timeout: "Generation timed out.",
    invalid_provider_response: "Unexpected response.",
    configuration_missing: "Configuration missing.",
    persistence_failure: "Save failed.",
  };
  return m[c];
}

export async function generateIcp(
  wsId: string,
  projectId: string,
  tcId: string,
  projectSlug: string,
  userId: string,
): Promise<{ runId: string; profile: IcpProfileRowLite }> {
  const env = parseServerEnv();

  const project = await getProjectService(projectSlug);
  if (!project) throw new IcpGenError("project_not_found", safeIcpError("project_not_found"));

  const tc = await getTargetCountry(wsId, tcId);
  if (!tc) throw new IcpGenError("country_not_found", safeIcpError("country_not_found"));

  const mRun = await getLatestMarketAnalysisRun(wsId, tcId);
  if (!mRun || mRun.status !== "succeeded" || !mRun.output)
    throw new IcpGenError("market_analysis_missing", safeIcpError("market_analysis_missing"));
  const mOut = mRun.output as Record<string, unknown>;

  const pRun = await getLatestProductRun(projectId);
  if (!pRun || pRun.status !== "succeeded" || !pRun.output)
    throw new IcpGenError("product_analysis_missing", safeIcpError("product_analysis_missing"));
  const pOut = pRun.output as Record<string, unknown>;
  const intelCtx = toProductIntelligenceContext(pOut);

  if (await hasActiveIcpRun(tcId))
    throw new IcpGenError("already_running", safeIcpError("already_running"));

  const inputSnapshot = {
    project: {
      name: project.name,
      productDescription: project.product_description,
      websiteUrl: project.website_url,
      businessModel: project.business_model,
      pricingSummary: project.pricing_summary,
      currentMarkets: project.current_markets,
      preferredLanguage: project.preferred_language,
    },
    productAnalysis: {
      ...intelCtx,
      userRoles: (pOut.userRoles as string[]) ?? [],
      adoptionBarriers: (pOut.adoptionBarriers as string[]) ?? [],
      purchaseTriggers: pOut.purchaseTriggers,
      confidence: pOut.confidence,
      missingInformation: pOut.missingInformation,
    },
    targetCountry: { code: tc.country_code, name: tc.country_name, region: tc.region_code },
    marketAnalysis: {
      recommendation: mOut.entryRecommendation,
      confidence: mOut.confidence,
      strongestFitSignals: mOut.strongestFitSignals,
      weakestFitSignals: mOut.weakestFitSignals,
      relevantCustomerSegments: mOut.relevantCustomerSegments,
      localizationRequirements: mOut.localizationRequirements,
      likelyAcquisitionChannels: mOut.likelyAcquisitionChannels,
      regulatoryConsiderations: mOut.regulatoryConsiderations,
      operationalChallenges: mOut.operationalChallenges,
      unresolvedQuestions: mOut.unresolvedQuestions,
    },
  };

  const provider = createAiProvider(env.DEFAULT_AI_PROVIDER);
  const run = await createIcpGenRun(wsId, {
    workspace_id: wsId,
    project_id: projectId,
    project_target_country_id: tcId,
    market_analysis_run_id: mRun.id,
    requested_by: userId,
    provider: provider.name,
    model: env.OPENAI_MODEL,
    generation_version: "v1",
    prompt_version: env.OPENAI_PROMPT_VERSION,
    input_snapshot: inputSnapshot,
  });

  await updateIcpGenRun(wsId, run.id, { status: "running", started_at: new Date().toISOString() });

  let genResult: CountrySpecificIcpResult;
  try {
    const aiInput = {
      countryCode: tc.country_code,
      countryName: tc.country_name,
      productName: project.name,
      productDescription: project.product_description ?? "",
      ...intelCtx,
      userRoles: (pOut.userRoles as string[]) ?? [],
      adoptionBarriers: (pOut.adoptionBarriers as string[]) ?? [],
      purchaseTriggers: (pOut.purchaseTriggers as string[]) ?? [],
      marketRecommendation: String(mOut.entryRecommendation ?? "investigate"),
      marketConfidence: String(mOut.confidence ?? "medium"),
      strongestFitSignals: (mOut.strongestFitSignals as string[]) ?? [],
      weakestFitSignals: (mOut.weakestFitSignals as string[]) ?? [],
      relevantCustomerSegments: (mOut.relevantCustomerSegments as string[]) ?? [],
      localizationRequirements: String(mOut.localizationRequirements ?? ""),
      acquisitionChannels: (mOut.likelyAcquisitionChannels as string[]) ?? [],
      regulatoryConsiderations: String(mOut.regulatoryConsiderations ?? ""),
      operationalChallenges: (mOut.operationalChallenges as string[]) ?? [],
      unresolvedQuestions: (mOut.unresolvedQuestions as string[]) ?? [],
      countryRegion: tc.region_code ?? "unknown",
      businessModel: project.business_model ?? undefined,
      pricingSummary: project.pricing_summary ?? undefined,
    };
    const res = await provider.generateCountrySpecificIcpV1(aiInput);
    const val = countrySpecificIcpResultSchema.safeParse(res.data);
    if (!val.success) {
      await updateIcpGenRun(wsId, run.id, {
        status: "failed",
        error_code: "invalid_provider_response",
        safe_error_message: safeIcpError("invalid_provider_response"),
        completed_at: new Date().toISOString(),
      });
      throw new IcpGenError("invalid_provider_response", safeIcpError("invalid_provider_response"));
    }
    genResult = val.data;
  } catch (err) {
    if (err instanceof IcpGenError) throw err;
    const msg = err instanceof Error ? err.message : "Unknown";
    const code: IcpGenErrorCode = msg.includes("timeout")
      ? "provider_timeout"
      : "provider_unavailable";
    await updateIcpGenRun(wsId, run.id, {
      status: "failed",
      error_code: code,
      safe_error_message: safeIcpError(code),
      completed_at: new Date().toISOString(),
    });
    throw new IcpGenError(code, safeIcpError(code));
  }

  await updateIcpGenRun(wsId, run.id, {
    status: "succeeded",
    output: genResult as unknown as Record<string, unknown>,
    completed_at: new Date().toISOString(),
  });

  const version = await getNextVersion(wsId, tcId);
  const profile = await createIcpProfile(wsId, {
    workspace_id: wsId,
    project_id: projectId,
    project_target_country_id: tcId,
    market_analysis_run_id: mRun.id,
    product_analysis_run_id: pRun.id,
    created_by: userId,
    current_generation_run_id: run.id,
    version,
    status: "draft",
    name: genResult.profileName,
    summary: genResult.summary,
    country_code: tc.country_code,
    industry_segments: {
      primary: genResult.primaryIndustries,
      secondary: genResult.secondaryIndustries,
    },
    company_attributes: genResult.companyAttributes,
    buyer_roles: genResult.buyerRoles,
    user_roles: genResult.userRoles,
    pains: genResult.primaryPains,
    desired_outcomes: [
      ...genResult.desiredBusinessOutcomes,
      ...genResult.desiredOperationalOutcomes,
    ],
    purchase_triggers: genResult.purchaseTriggers,
    qualification_signals: genResult.qualificationSignals,
    disqualification_signals: genResult.disqualificationSignals,
    objections: genResult.objections,
    procurement_context: genResult.procurementContext
      ? { summary: genResult.procurementContext }
      : null,
    localization_requirements: genResult.localizationRequirements
      ? { summary: genResult.localizationRequirements }
      : null,
    technology_context: genResult.technologyContext
      ? { summary: genResult.technologyContext }
      : null,
    assumptions: genResult.assumptions,
    missing_information: genResult.missingInformation,
    validation_questions: genResult.validationQuestions,
    confidence: genResult.confidence,
    confidence_reason: genResult.confidenceReason,
  });

  return {
    runId: run.id,
    profile: {
      id: profile.id,
      version: profile.version,
      name: profile.name,
      status: profile.status,
      country_code: profile.country_code,
    },
  };
}

export interface IcpProfileRowLite {
  id: string;
  version: number;
  name: string;
  status: string;
  country_code: string;
}
