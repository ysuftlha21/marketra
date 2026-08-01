export const OPENAI_REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh", "max"] as const;

export type OpenAiReasoningEffort = (typeof OPENAI_REASONING_EFFORTS)[number];
export type OpenAiModelId = keyof typeof OPENAI_MODEL_REGISTRY;

export interface OpenAiModelDefinition {
  readonly modelId: string;
  readonly family: "GPT-4o" | "GPT-5.6";
  readonly defaultReasoningEffort: OpenAiReasoningEffort | null;
  readonly api: "chat_completions" | "responses";
  readonly structuredOutput: true;
  readonly costTier: "legacy_economy" | "efficient" | "balanced" | "flagship";
  readonly intendedTaskClass: "legacy_general" | "high_volume" | "balanced" | "quality_first";
  readonly supportedReasoningEfforts: readonly OpenAiReasoningEffort[];
}

const GPT_5_6_REASONING = OPENAI_REASONING_EFFORTS;

export const OPENAI_MODEL_REGISTRY = {
  "gpt-4o-mini": {
    modelId: "gpt-4o-mini",
    family: "GPT-4o",
    defaultReasoningEffort: null,
    api: "chat_completions",
    structuredOutput: true,
    costTier: "legacy_economy",
    intendedTaskClass: "legacy_general",
    supportedReasoningEfforts: [],
  },
  "gpt-5.6-luna": {
    modelId: "gpt-5.6-luna",
    family: "GPT-5.6",
    defaultReasoningEffort: "low",
    api: "responses",
    structuredOutput: true,
    costTier: "efficient",
    intendedTaskClass: "high_volume",
    supportedReasoningEfforts: GPT_5_6_REASONING,
  },
  "gpt-5.6-terra": {
    modelId: "gpt-5.6-terra",
    family: "GPT-5.6",
    defaultReasoningEffort: "low",
    api: "responses",
    structuredOutput: true,
    costTier: "balanced",
    intendedTaskClass: "balanced",
    supportedReasoningEfforts: GPT_5_6_REASONING,
  },
  "gpt-5.6-sol": {
    modelId: "gpt-5.6-sol",
    family: "GPT-5.6",
    defaultReasoningEffort: "low",
    api: "responses",
    structuredOutput: true,
    costTier: "flagship",
    intendedTaskClass: "quality_first",
    supportedReasoningEfforts: GPT_5_6_REASONING,
  },
  "gpt-5.6": {
    modelId: "gpt-5.6",
    family: "GPT-5.6",
    defaultReasoningEffort: "low",
    api: "responses",
    structuredOutput: true,
    costTier: "flagship",
    intendedTaskClass: "quality_first",
    supportedReasoningEfforts: GPT_5_6_REASONING,
  },
} as const satisfies Record<string, OpenAiModelDefinition>;

export const OPENAI_MODEL_IDS = Object.keys(OPENAI_MODEL_REGISTRY) as [
  OpenAiModelId,
  ...OpenAiModelId[],
];

export function getOpenAiModelDefinition(modelId: OpenAiModelId): OpenAiModelDefinition {
  return OPENAI_MODEL_REGISTRY[modelId];
}

export function resolveOpenAiReasoningEffort(
  modelId: OpenAiModelId,
  configured?: OpenAiReasoningEffort,
): OpenAiReasoningEffort | undefined {
  const model = getOpenAiModelDefinition(modelId);
  return configured ?? model.defaultReasoningEffort ?? undefined;
}
