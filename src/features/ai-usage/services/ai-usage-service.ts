import type { ProviderRunMeta } from "@/lib/providers/provider-types";
import { estimateAiCostUsd } from "@/config/ai-pricing";
import { recordAiUsage } from "../repository/ai-usage-repository";

export async function recordProviderUsage(input: {
  workspaceId: string;
  projectId?: string;
  operationType: string;
  generationRunId?: string;
  meta: ProviderRunMeta;
  success?: boolean;
  controlledErrorCode?: string;
}): Promise<void> {
  const providerId = input.meta.providerName;
  const estimatedCost = estimateAiCostUsd(
    providerId,
    input.meta.modelId,
    input.meta.inputTokens,
    input.meta.outputTokens,
  );
  await recordAiUsage({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    operationType: input.operationType,
    providerId,
    modelId: input.meta.modelId,
    generationRunId: input.generationRunId,
    inputTokens: input.meta.inputTokens,
    outputTokens: input.meta.outputTokens,
    totalTokens: input.meta.tokens,
    estimatedCost: estimatedCost ?? undefined,
    currency: estimatedCost === null ? undefined : "USD",
    durationMs: input.meta.durationMs,
    success: input.success ?? true,
    controlledErrorCode: input.controlledErrorCode,
  });
}
