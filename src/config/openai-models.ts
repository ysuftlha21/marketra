export const OPENAI_REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh", "max"] as const;

export type OpenAiReasoningEffort = (typeof OPENAI_REASONING_EFFORTS)[number];
export type OpenAiModelId = keyof typeof OPENAI_MODEL_REGISTRY;

export interface OpenAiModelDefinition {
  readonly modelId: string;
  readonly family: "GPT-4o";
  readonly defaultReasoningEffort: OpenAiReasoningEffort | null;
  readonly api: "chat_completions";
  readonly structuredOutput: true;
  readonly costTier: "legacy_economy";
  readonly intendedTaskClass: "legacy_general";
  readonly supportedReasoningEfforts: readonly OpenAiReasoningEffort[];
}

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
