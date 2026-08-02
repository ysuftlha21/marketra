export const OPENAI_TASK_OUTPUT_TOKEN_BUDGETS = {
  product_analysis_legacy: 1_200,
  product_analysis_v1: 1_200,
  product_analysis_v2: 1_200,
  country_market_analysis_v1: 1_200,
  country_specific_icp_v1: 1_600,
} as const;

export const OPENAI_TASK_REGISTRY = {
  country_specific_icp_v1: {
    taskId: "country-icp-generation",
    capability: "country_specific_icp",
    api: "chat_completions",
    structuredOutput: "json_schema_strict",
    outputTokenBudget: OPENAI_TASK_OUTPUT_TOKEN_BUDGETS.country_specific_icp_v1,
    timeoutPolicy: "provider_default_bounded",
    retryPolicy: "one_structured_output_repair_only",
    usageEventType: "country_icp_generation",
    promptVersion: "v1",
  },
} as const;

export function resolveOpenAiOutputTokenBudget(operation: string, fallback: number): number {
  return (
    OPENAI_TASK_OUTPUT_TOKEN_BUDGETS[operation as keyof typeof OPENAI_TASK_OUTPUT_TOKEN_BUDGETS] ??
    fallback
  );
}
