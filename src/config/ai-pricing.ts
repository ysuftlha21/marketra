export interface AiModelPrice {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

const OPENAI_PRICES: Readonly<Record<string, AiModelPrice>> = {
  // Pricing is metadata, not provider execution logic. Update only from an
  // authoritative provider price sheet and record the change in the Decision Log.
  "gpt-4o-mini": { inputPerMillionUsd: 0.15, outputPerMillionUsd: 0.6 },
};

export function getAiModelPrice(providerId: string, modelId: string): AiModelPrice | null {
  if (providerId !== "openai") return null;
  return OPENAI_PRICES[modelId] ?? null;
}

export function estimateAiCostUsd(
  providerId: string,
  modelId: string | undefined,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): number | null {
  if (!modelId || inputTokens === undefined || outputTokens === undefined) return null;
  const price = getAiModelPrice(providerId, modelId);
  if (!price) return null;
  return (
    (inputTokens * price.inputPerMillionUsd + outputTokens * price.outputPerMillionUsd) / 1_000_000
  );
}
