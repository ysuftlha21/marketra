export const OPENAI_TASK_OUTPUT_TOKEN_BUDGETS = {
  product_analysis_legacy: 1_200,
  product_analysis_v1: 1_200,
  product_analysis_v2: 1_200,
} as const;

export function resolveOpenAiOutputTokenBudget(operation: string, fallback: number): number {
  return (
    OPENAI_TASK_OUTPUT_TOKEN_BUDGETS[operation as keyof typeof OPENAI_TASK_OUTPUT_TOKEN_BUDGETS] ??
    fallback
  );
}
