import { createAiProvider } from "@/lib/providers/ai/ai.factory";
import { createMarketIntelligenceProvider } from "@/lib/providers/market/market.factory";
import { getProjectService } from "@/features/projects/services/project-service";
import { getLatestAnalysisRun as getLatestProductAnalysis } from "@/features/projects/repository/project-repository";
import {
  createMarketAnalysisRun,
  updateMarketAnalysisRun,
  hasActiveMarketAnalysisRun,
  getTargetCountry,
  getMarketAnalysisRun,
} from "../repository/market-repository";
import { countryMarketAnalysisResultSchema } from "../schema/market-analysis-schemas";
import type { CountryMarketAnalysisResult } from "../schema/market-analysis-schemas";
import { parseServerEnv } from "@/lib/env/env";
import { toProductIntelligenceContext } from "@/features/projects/domain/product-intelligence";
import { canStartAnalysis, type TargetCountryStatus } from "../domain/target-country-status";
import { enforceRateLimit } from "@/lib/security/rate-limit-service";
import { recordProviderUsage } from "@/features/ai-usage/services/ai-usage-service";
import type { ProviderRunMeta } from "@/lib/providers/provider-types";
import { AiProviderError } from "@/lib/providers/ai/openai-client";

export interface MarketAnalysisContext {
  workspaceId: string;
  projectSlug: string;
  projectId: string;
  userId: string;
  targetCountryId: string;
}

export type MarketAnalysisErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "project_not_found"
  | "country_not_found"
  | "analysis_already_running"
  | "project_analysis_missing"
  | "intelligence_provider_unavailable"
  | "ai_provider_unavailable"
  | "provider_timeout"
  | "invalid_provider_response"
  | "configuration_missing"
  | "persistence_failure";

export class MarketAnalysisServiceError extends Error {
  readonly code: MarketAnalysisErrorCode;
  constructor(
    code: MarketAnalysisErrorCode,
    message: string,
    readonly safeReference?: string,
  ) {
    super(message);
    this.name = "MarketAnalysisServiceError";
    this.code = code;
  }
}

export function safeMarketAnalysisError(code: MarketAnalysisErrorCode): string {
  const messages: Record<MarketAnalysisErrorCode, string> = {
    unauthenticated: "Sign in to run market analysis.",
    unauthorized: "You do not have permission for this action.",
    project_not_found: "Project not found.",
    country_not_found: "Target country not found.",
    analysis_already_running: "A market analysis is already running for this country.",
    project_analysis_missing: "Run a product analysis first before analyzing markets.",
    intelligence_provider_unavailable: "Market intelligence provider is unavailable.",
    ai_provider_unavailable: "AI analysis provider is unavailable.",
    provider_timeout: "The analysis took too long. Try again.",
    invalid_provider_response: "Received an unexpected response from the provider.",
    configuration_missing: "Analysis is not configured properly.",
    persistence_failure: "Could not save the analysis result.",
  };
  return messages[code];
}

export async function runMarketAnalysis(
  ctx: MarketAnalysisContext,
): Promise<{ runId: string; result?: CountryMarketAnalysisResult }> {
  await enforceRateLimit({
    operation: "market_analysis",
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    limit: 10,
  });
  const env = parseServerEnv();

  const tc = await getTargetCountry(ctx.workspaceId, ctx.targetCountryId);
  if (!tc)
    throw new MarketAnalysisServiceError(
      "country_not_found",
      safeMarketAnalysisError("country_not_found"),
    );
  if (tc.project_id !== ctx.projectId) {
    throw new MarketAnalysisServiceError(
      "country_not_found",
      safeMarketAnalysisError("country_not_found"),
    );
  }
  if (!canStartAnalysis(tc.status as TargetCountryStatus)) {
    throw new MarketAnalysisServiceError(
      "analysis_already_running",
      safeMarketAnalysisError("analysis_already_running"),
    );
  }

  const isActive = await hasActiveMarketAnalysisRun(ctx.targetCountryId);
  if (isActive) {
    throw new MarketAnalysisServiceError(
      "analysis_already_running",
      safeMarketAnalysisError("analysis_already_running"),
    );
  }

  const project = await getProjectService(ctx.projectSlug);
  if (!project)
    throw new MarketAnalysisServiceError(
      "project_not_found",
      safeMarketAnalysisError("project_not_found"),
    );

  const latestProductRun = await getLatestProductAnalysis(ctx.projectId);
  if (!latestProductRun || latestProductRun.status !== "succeeded" || !latestProductRun.output) {
    throw new MarketAnalysisServiceError(
      "project_analysis_missing",
      safeMarketAnalysisError("project_analysis_missing"),
    );
  }
  const productOutput = latestProductRun.output as Record<string, unknown>;
  const intelCtx = toProductIntelligenceContext(productOutput);

  let intelProvider;
  let aiProvider;
  try {
    intelProvider = createMarketIntelligenceProvider(env.DEFAULT_MARKET_INTELLIGENCE_PROVIDER);
    aiProvider = createAiProvider(env.DEFAULT_AI_PROVIDER);
  } catch {
    throw new MarketAnalysisServiceError(
      "configuration_missing",
      safeMarketAnalysisError("configuration_missing"),
    );
  }

  const inputSnapshot = {
    project: {
      name: project.name,
      productDescription: project.product_description,
      websiteUrl: project.website_url,
      ...intelCtx,
    },
    country: {
      code: tc.country_code,
      name: tc.country_name,
      region: tc.region_code,
      analysisVersion: "v1",
    },
    assumptions: (tc.analysis_assumptions as Record<string, unknown>) ?? {},
  };

  const run = await createMarketAnalysisRun(
    ctx.workspaceId,
    ctx.projectId,
    ctx.targetCountryId,
    ctx.userId,
    {
      provider: `${intelProvider.name} + ${aiProvider.name}`,
      model: env.OPENAI_MODEL,
      analysisVersion: "v1",
      promptVersion: env.OPENAI_PROMPT_VERSION,
      inputSnapshot,
    },
  );

  try {
    await updateTargetCountryStatus(ctx.workspaceId, ctx.targetCountryId, "analyzing");
  } catch {
    /* non-fatal */
  }

  await updateMarketAnalysisRun(ctx.workspaceId, run.id, {
    status: "running",
    started_at: new Date().toISOString(),
  });

  let intelligenceSnapshot: Record<string, unknown>;
  try {
    const intelResult = await intelProvider.getCountryMarketIntelligenceV1({
      countryCode: tc.country_code,
      countryName: tc.country_name,
      productSummary: intelCtx.productSummary,
      region: tc.region_code ?? undefined,
      assumptions: (tc.analysis_assumptions as Record<string, unknown>) ?? {},
      productCategories: intelCtx.customerCategories,
    });
    intelligenceSnapshot = intelResult.data as unknown as Record<string, unknown>;
  } catch {
    await updateMarketAnalysisRun(ctx.workspaceId, run.id, {
      status: "failed",
      error_code: "intelligence_provider_unavailable",
      safe_error_message: safeMarketAnalysisError("intelligence_provider_unavailable"),
      completed_at: new Date().toISOString(),
    });
    throw new MarketAnalysisServiceError(
      "intelligence_provider_unavailable",
      safeMarketAnalysisError("intelligence_provider_unavailable"),
    );
  }

  await updateMarketAnalysisRun(ctx.workspaceId, run.id, {
    intelligence_snapshot: intelligenceSnapshot,
  });

  const intel = intelligenceSnapshot;
  const aiInput = {
    countryCode: tc.country_code,
    countryName: tc.country_name,
    productName: project.name,
    ...intelCtx,
    intelligenceSummary: String(intel.executiveSummary ?? intel.summary ?? ""),
    intelligenceBusinessEnv: String(intel.businessEnvironment ?? ""),
    intelligenceDigitalAdoption: String(intel.digitalAdoption ?? ""),
    intelligenceSaaSEnv: String(intel.saasPurchasingEnvironment ?? ""),
    intelligencePaymentExpectations: String(intel.paymentExpectations ?? ""),
    intelligenceProcurementComplexity: String(intel.procurementComplexity ?? ""),
    intelligenceRegulatory: String(intel.regulatoryConsiderations ?? ""),
    intelligenceDataProtection: String(intel.dataProtectionConsiderations ?? ""),
    intelligenceLocalization: String(intel.localizationConsiderations ?? ""),
    intelligenceSalesCycle: String(intel.salesCycleObservations ?? ""),
    intelligenceChannels: String(intel.channelObservations ?? ""),
    assumptions: {} as Record<string, unknown>,
  };

  let providerResult: { data: CountryMarketAnalysisResult; meta: ProviderRunMeta };
  try {
    providerResult = (await aiProvider.analyzeCountryMarketV1(
      aiInput,
    )) as unknown as typeof providerResult;
  } catch (err) {
    if (err instanceof AiProviderError) {
      const reference =
        err.code === "invalid_api_key"
          ? "AI-PROVIDER-AUTH"
          : err.code === "model_not_found" || err.code === "model_access_denied"
            ? "AI-PROVIDER-MODEL"
            : err.code === "insufficient_quota"
              ? "AI-PROVIDER-QUOTA"
              : err.code === "rate_limited"
                ? "AI-PROVIDER-RATE"
                : err.code === "timeout"
                  ? "AI-PROVIDER-TIMEOUT"
                  : err.code === "structured_output_invalid"
                    ? "AI-PROVIDER-OUTPUT"
                    : "AI-PROVIDER-UNAVAILABLE";
      const code: MarketAnalysisErrorCode =
        err.code === "timeout"
          ? "provider_timeout"
          : err.code === "structured_output_invalid"
            ? "invalid_provider_response"
            : "ai_provider_unavailable";
      await updateMarketAnalysisRun(ctx.workspaceId, run.id, {
        status: "failed",
        error_code: code,
        safe_error_message: safeMarketAnalysisError(code),
        completed_at: new Date().toISOString(),
      }).catch(() => undefined);
      throw new MarketAnalysisServiceError(code, safeMarketAnalysisError(code), reference);
    }
    const message =
      err && typeof err === "object" && "message" in err ? String(err.message) : "Unknown error";
    const code: MarketAnalysisErrorCode = message.includes("timeout")
      ? "provider_timeout"
      : "ai_provider_unavailable";
    await updateMarketAnalysisRun(ctx.workspaceId, run.id, {
      status: "failed",
      error_code: code,
      safe_error_message: safeMarketAnalysisError(code),
      completed_at: new Date().toISOString(),
    }).catch(() => {});
    throw new MarketAnalysisServiceError(code, safeMarketAnalysisError(code));
  }

  const validated = countryMarketAnalysisResultSchema.safeParse(providerResult.data);
  if (!validated.success) {
    await updateMarketAnalysisRun(ctx.workspaceId, run.id, {
      status: "failed",
      error_code: "invalid_provider_response",
      safe_error_message: safeMarketAnalysisError("invalid_provider_response"),
      completed_at: new Date().toISOString(),
    });
    throw new MarketAnalysisServiceError(
      "invalid_provider_response",
      safeMarketAnalysisError("invalid_provider_response"),
    );
  }

  const result = validated.data;

  if (env.AI_COST_TRACKING_ENABLED) {
    await recordProviderUsage({
      workspaceId: ctx.workspaceId,
      projectId: ctx.projectId,
      operationType: "market_analysis",
      generationRunId: run.id,
      meta: providerResult.meta,
    }).catch(() => undefined);
  }

  await updateMarketAnalysisRun(ctx.workspaceId, run.id, {
    status: "succeeded",
    output: result as unknown as Record<string, unknown>,
    input_tokens: providerResult.meta.inputTokens ?? providerResult.meta.tokens ?? null,
    output_tokens: providerResult.meta.outputTokens ?? null,
    estimated_cost: providerResult.meta.estimatedCostUsd ?? null,
    completed_at: new Date().toISOString(),
  });

  try {
    await updateTargetCountryStatus(ctx.workspaceId, ctx.targetCountryId, "analyzed");
  } catch {
    /* non-fatal */
  }

  return { runId: run.id, result };
}

export async function retryMarketAnalysis(
  ctx: MarketAnalysisContext,
  previousRunId: string,
): Promise<{ runId: string; result?: CountryMarketAnalysisResult }> {
  const previousRun = await getMarketAnalysisRun(ctx.workspaceId, previousRunId);
  if (!previousRun)
    throw new MarketAnalysisServiceError(
      "country_not_found",
      safeMarketAnalysisError("country_not_found"),
    );
  return runMarketAnalysis(ctx);
}

async function updateTargetCountryStatus(wsId: string, tcId: string, status: string) {
  const repo = await import("../repository/market-repository");
  await repo.updateTargetCountry(wsId, tcId, { status });
}
