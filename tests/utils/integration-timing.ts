const SLOW_OPERATION_MS = 2_000;

export type IntegrationOperationCategory =
  | "supabase_auth"
  | "supabase_database"
  | "fixture_user"
  | "fixture_workspace"
  | "fixture_cleanup"
  | "suite_setup";

export async function measureIntegrationOperation<T>(
  category: IntegrationOperationCategory,
  operation: string,
  execute: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await execute();
  } finally {
    const durationMs = Math.round(performance.now() - startedAt);
    if (process.env.INTEGRATION_TIMING_DIAGNOSTICS === "true" || durationMs >= SLOW_OPERATION_MS) {
      console.warn(
        JSON.stringify({
          scope: "integration_test_timing",
          category,
          operation,
          durationMs,
        }),
      );
    }
  }
}
