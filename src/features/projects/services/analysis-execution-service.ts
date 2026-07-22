import { createAiProvider } from "@/lib/providers/ai/ai.factory";
import type { AiProvider } from "@/lib/providers/ai/ai.provider";
import {
  createAnalysisRun,
  updateAnalysisRun,
  getAnalysisRun,
  getProjectBySlug,
  hasActiveAnalysisRun,
} from "../repository/project-repository";
import {
  v1ProductAnalysisInputSchema,
  v1ProductAnalysisResultSchema,
  v2ProductAnalysisInputSchema,
  v2ProductAnalysisResultSchema,
  type ProductAnalysisResultAny,
} from "../schema/analysis-schemas";
import { parseServerEnv } from "@/lib/env/env";
import type { ProviderResult } from "@/lib/providers/provider-types";
import type {
  V1ProductAnalysisInput,
  V1ProductAnalysisResult,
  V2ProductAnalysisInput,
  V2ProductAnalysisResult,
} from "@/lib/providers/ai/ai.provider";
import { fetchProductWebsite } from "@/lib/security/ssrf";
import { enforceRateLimit } from "@/lib/security/rate-limit-service";
import { recordProviderUsage } from "@/features/ai-usage/services/ai-usage-service";

export interface AnalysisContext {
  workspaceId: string;
  projectSlug: string;
  userId: string;
  projectId: string;
}

export type AnalysisServiceErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "project_not_found"
  | "project_archived"
  | "analysis_already_running"
  | "provider_unavailable"
  | "provider_timeout"
  | "invalid_provider_response"
  | "rate_limited"
  | "configuration_missing"
  | "invalid_input"
  | "analysis_run_creation_failed"
  | "website_url_rejected"
  | "website_fetch_failed"
  | "provider_not_available"
  | "provider_execution_failed"
  | "provider_output_invalid"
  | "analysis_persistence_failed"
  | "analysis_completion_failed"
  | "active_analysis_exists";

export class AnalysisServiceError extends Error {
  readonly code: AnalysisServiceErrorCode;
  readonly stage: string;
  constructor(code: AnalysisServiceErrorCode, message: string, stage: string = "unknown") {
    super(message);
    this.name = "AnalysisServiceError";
    this.code = code;
    this.stage = stage;
  }
}

export function safeAnalysisError(code: AnalysisServiceErrorCode): string {
  const messages: Record<AnalysisServiceErrorCode, string> = {
    unauthenticated: "Sign in to run an analysis.",
    unauthorized: "You do not have permission to analyze this project.",
    project_not_found: "Project not found.",
    project_archived: "This project is archived and cannot be analyzed.",
    analysis_already_running: "An analysis is already running for this project.",
    provider_unavailable: "The analysis provider is currently unavailable. Try again later.",
    provider_timeout: "The analysis took too long. Try again later.",
    invalid_provider_response: "Received an unexpected response from the analysis provider.",
    rate_limited: "Too many analysis requests. Please wait and try again.",
    configuration_missing: "Analysis is not configured. Contact support.",
    invalid_input: "Invalid analysis input. Check your product information.",
    analysis_run_creation_failed: "Failed to create an analysis run. Please try again.",
    website_url_rejected:
      "The provided website URL is unsafe or inaccessible. Please update the project website.",
    website_fetch_failed:
      "Failed to reach the provided website. Ensure it is online and publicly accessible.",
    provider_not_available: "The AI provider is currently unavailable.",
    provider_execution_failed: "The AI provider encountered an error during analysis.",
    provider_output_invalid: "The AI provider returned invalid or unexpected results.",
    analysis_persistence_failed: "Failed to save analysis progress or results.",
    analysis_completion_failed: "Failed to mark the analysis as completed.",
    active_analysis_exists: "An analysis is already actively running for this project.",
  };
  return messages[code] || "An unexpected error occurred.";
}

export async function runProductAnalysis(
  ctx: AnalysisContext,
  input: Record<string, unknown>,
): Promise<{ runId: string; result?: ProductAnalysisResultAny }> {
  await enforceRateLimit({
    operation: "product_analysis",
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    limit: 10,
  });
  const env = parseServerEnv();
  const version = (input.schemaVersion as string) || env.PRODUCT_ANALYSIS_VERSION;
  const promptVersion =
    (input.promptVersion as string) ||
    (version === "v2" ? env.OPENAI_PROMPT_VERSION_V2 : env.OPENAI_PROMPT_VERSION);

  let parsedInput:
    | { success: true; data: V1ProductAnalysisInput | V2ProductAnalysisInput }
    | { success: false; error: { issues: { message: string }[] } };
  if (version === "v2") {
    parsedInput = v2ProductAnalysisInputSchema.safeParse({ ...input, schemaVersion: "v2" });
  } else {
    parsedInput = v1ProductAnalysisInputSchema.safeParse({ ...input, schemaVersion: "v1" });
  }

  if (!parsedInput.success) {
    throw new AnalysisServiceError(
      "invalid_input",
      parsedInput.error.issues[0]?.message ?? "Invalid input",
      "pre-flight",
    );
  }

  const existing = await getProjectBySlug(ctx.workspaceId, ctx.projectSlug);
  if (!existing) {
    throw new AnalysisServiceError(
      "project_not_found",
      safeAnalysisError("project_not_found"),
      "pre-flight",
    );
  }
  if (existing.status === "archived") {
    throw new AnalysisServiceError(
      "project_archived",
      safeAnalysisError("project_archived"),
      "pre-flight",
    );
  }

  const isActive = await hasActiveAnalysisRun(ctx.projectId);
  if (isActive) {
    throw new AnalysisServiceError(
      "active_analysis_exists",
      safeAnalysisError("active_analysis_exists"),
      "pre-flight",
    );
  }

  // 1. run creation
  let run;
  try {
    run = await createAnalysisRun(ctx.workspaceId, ctx.projectId, ctx.userId, {
      provider: "pending",
      model: env.OPENAI_MODEL,
      promptVersion: promptVersion,
      schemaVersion: version,
      inputSnapshot: parsedInput.data as unknown as Record<string, unknown>,
      current_stage: "preparing_project_data",
    });
    console.log(`[Diagnostic] Stage: run creation - SUCCESS - RunID: ${run.id}`);
  } catch {
    console.error(
      `[Diagnostic] Stage: run creation - FAILED - RunID: unknown - Error: analysis_run_creation_failed - Class: `,
    );
    throw new AnalysisServiceError(
      "analysis_run_creation_failed",
      safeAnalysisError("analysis_run_creation_failed"),
      "run creation",
    );
  }

  try {
    // 2. website URL validation & 3. website fetch
    let websiteContent = "";

    const updateStage = async (stage: string) => {
      try {
        await updateAnalysisRun(ctx.workspaceId, run.id, { current_stage: stage });
      } catch {
        // ignore
      }
    };

    if (parsedInput.data.websiteUrl) {
      try {
        await updateStage("validating_website");
        console.log(`[Diagnostic] Stage: website URL validation - START - RunID: ${run.id}`);
        const res = await fetchProductWebsite(parsedInput.data.websiteUrl);
        console.log(`[Diagnostic] Stage: website URL validation - SUCCESS - RunID: ${run.id}`);
        await updateStage("reading_website_content");
        websiteContent = res.text.substring(0, 10000);
        console.log(`[Diagnostic] Stage: website fetch - SUCCESS - RunID: ${run.id}`);
      } catch (err: unknown) {
        const msg = String(err instanceof Error ? err.message : String(err)).toLowerCase();
        if (msg.includes("blocked") || msg.includes("unsafe")) {
          console.error(
            `[Diagnostic] Stage: website URL validation - FAILED - RunID: ${run.id} - Error: website_url_rejected - Class: `,
          );
          throw new AnalysisServiceError(
            "website_url_rejected",
            safeAnalysisError("website_url_rejected"),
            "website URL validation",
          );
        }
        console.error(
          `[Diagnostic] Stage: website fetch - FAILED - RunID: ${run.id} - Error: website_fetch_failed - Class: `,
        );
        throw new AnalysisServiceError(
          "website_fetch_failed",
          safeAnalysisError("website_fetch_failed"),
          "website fetch",
        );
      }
    } else {
      console.log(
        `[Diagnostic] Stage: website URL validation - SKIPPED (empty) - RunID: ${run.id}`,
      );
    }

    // 4. provider selection
    await updateStage("preparing_product_context");
    let provider: AiProvider;
    try {
      provider = createAiProvider(env.DEFAULT_AI_PROVIDER);
      console.log(`[Diagnostic] Stage: provider selection - SUCCESS - RunID: ${run.id}`);
    } catch {
      console.error(
        `[Diagnostic] Stage: provider selection - FAILED - RunID: ${run.id} - Error: provider_not_available - Class: `,
      );
      throw new AnalysisServiceError(
        "provider_not_available",
        safeAnalysisError("provider_not_available"),
        "provider selection",
      );
    }

    try {
      await updateStage("running_intelligence_analysis");
      await updateAnalysisRun(ctx.workspaceId, run.id, {
        status: "running",
        provider: provider.name,
        started_at: new Date().toISOString(),
      });
      console.log(`[Diagnostic] Stage: run update (running) - SUCCESS - RunID: ${run.id}`);
    } catch {
      console.error(
        `[Diagnostic] Stage: run update - FAILED - RunID: ${run.id} - Error: analysis_persistence_failed - Class: `,
      );
      throw new AnalysisServiceError(
        "analysis_persistence_failed",
        safeAnalysisError("analysis_persistence_failed"),
        "run update",
      );
    }

    // 5. provider call
    let providerResult: ProviderResult<V1ProductAnalysisResult | V2ProductAnalysisResult>;
    try {
      const aiInput = {
        ...parsedInput.data,
        scrapedWebsiteText: websiteContent || undefined,
      };
      if (version === "v2") {
        providerResult = await provider.analyzeProductV2(aiInput as V2ProductAnalysisInput);
      } else {
        providerResult = await provider.analyzeProductV1(aiInput as V1ProductAnalysisInput);
      }
      console.log(`[Diagnostic] Stage: provider call - SUCCESS - RunID: ${run.id}`);
    } catch (err: unknown) {
      console.error(
        `[Diagnostic] Stage: provider call - FAILED - RunID: ${run.id} - Error: provider_execution_failed - Class: `,
      );
      const message = String(
        (err instanceof Error ? err.message : String(err)) || "",
      ).toLowerCase();
      if (message.includes("timeout") || message.includes("timed out")) {
        throw new AnalysisServiceError(
          "provider_timeout",
          safeAnalysisError("provider_timeout"),
          "provider call",
        );
      }
      throw new AnalysisServiceError(
        "provider_execution_failed",
        safeAnalysisError("provider_execution_failed"),
        "provider call",
      );
    }

    // 6. provider output validation
    await updateStage("validating_analysis_output");
    let validated;
    if (version === "v2") {
      validated = v2ProductAnalysisResultSchema.safeParse(providerResult.data);
    } else {
      validated = v1ProductAnalysisResultSchema.safeParse(providerResult.data);
    }

    if (!validated.success) {
      console.error(
        `[Diagnostic] Stage: provider output validation - FAILED - RunID: ${run.id} - Error: provider_output_invalid - Class: ZodError`,
      );
      throw new AnalysisServiceError(
        "provider_output_invalid",
        safeAnalysisError("provider_output_invalid"),
        "provider output validation",
      );
    }
    console.log(`[Diagnostic] Stage: provider output validation - SUCCESS - RunID: ${run.id}`);

    // 7. result persistence
    await updateStage("saving_results");
    const result: ProductAnalysisResultAny = validated.data as ProductAnalysisResultAny;
    const { meta } = providerResult;

    if (env.AI_COST_TRACKING_ENABLED) {
      await recordProviderUsage({
        workspaceId: ctx.workspaceId,
        projectId: ctx.projectId,
        operationType: "product_analysis",
        generationRunId: run.id,
        meta,
      }).catch(() => undefined);
    }

    try {
      await updateAnalysisRun(ctx.workspaceId, run.id, {
        status: "succeeded",
        current_stage: "finalizing_analysis",
        output: result as unknown as Record<string, unknown>,
        input_tokens: meta.tokens ?? null,
        output_tokens: null,
        estimated_cost: meta.estimatedCostUsd ?? null,
        completed_at: new Date().toISOString(),
      });
      console.log(`[Diagnostic] Stage: result persistence - SUCCESS - RunID: ${run.id}`);
    } catch {
      console.error(
        `[Diagnostic] Stage: result persistence - FAILED - RunID: ${run.id} - Error: analysis_persistence_failed - Class: `,
      );
      throw new AnalysisServiceError(
        "analysis_persistence_failed",
        safeAnalysisError("analysis_persistence_failed"),
        "result persistence",
      );
    }

    // 8. run completion update (implicit above)
    console.log(`[Diagnostic] Stage: run completion update - SUCCESS - RunID: ${run.id}`);
    return { runId: run.id, result };
  } catch (err: unknown) {
    let svcErr = err;
    if (!(err instanceof AnalysisServiceError)) {
      svcErr = new AnalysisServiceError(
        "provider_execution_failed",
        safeAnalysisError("provider_execution_failed"),
        "unknown",
      );
    }

    // Update DB to failed
    if (run) {
      try {
        await updateAnalysisRun(ctx.workspaceId, run.id, {
          status: "failed",
          error_code: `${(svcErr as AnalysisServiceError).code}|${(svcErr as AnalysisServiceError).stage}`,
          safe_error_message: (svcErr as Error).message,
          completed_at: new Date().toISOString(),
        });
      } catch {
        // Ignore failure to update the run here
      }
    }
    throw svcErr;
  }
}

export async function retryFailedAnalysis(
  ctx: AnalysisContext,
  previousRunId: string,
): Promise<{ runId: string; result?: ProductAnalysisResultAny }> {
  const previousRun = await getAnalysisRun(ctx.workspaceId, previousRunId);
  if (!previousRun) {
    throw new AnalysisServiceError(
      "project_not_found",
      safeAnalysisError("project_not_found"),
      "pre-flight",
    );
  }

  const input = previousRun.input_snapshot;
  input.schemaVersion = previousRun.schema_version;
  input.promptVersion = previousRun.prompt_version;
  return runProductAnalysis(ctx, input);
}
