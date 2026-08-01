export const SAFE_SMOKE_FIELDS: readonly string[];
export function classifyRedisPreviewSmokeResponse(
  status: number,
  payload: unknown,
  parsed?: boolean,
): {
  success: boolean;
  output: Record<string, unknown>;
};
