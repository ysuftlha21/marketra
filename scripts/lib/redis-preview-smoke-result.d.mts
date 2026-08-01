export const SAFE_SMOKE_FIELDS: readonly string[];
export const SAFE_FAILURE_CATEGORIES: readonly string[];
export function classifyRedisPreviewSmokeResponse(
  status: number,
  payload: unknown,
  parsed?: boolean,
): {
  success: boolean;
  output: Record<string, unknown>;
};
