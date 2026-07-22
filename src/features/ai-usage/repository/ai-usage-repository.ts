import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

export interface AiUsageEventInput {
  workspaceId: string;
  projectId?: string;
  operationType: string;
  providerId: string;
  modelId?: string;
  generationRunId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  currency?: string;
  durationMs: number;
  success: boolean;
  controlledErrorCode?: string;
}

export async function recordAiUsageWithClient(
  client: SupabaseClient<Database>,
  event: AiUsageEventInput,
): Promise<void> {
  const result = await client.from("ai_usage_events" as never).insert({
    workspace_id: event.workspaceId,
    project_id: event.projectId ?? null,
    operation_type: event.operationType,
    provider_id: event.providerId,
    model_id: event.modelId ?? null,
    generation_run_id: event.generationRunId ?? null,
    input_tokens: event.inputTokens ?? null,
    output_tokens: event.outputTokens ?? null,
    total_tokens: event.totalTokens ?? null,
    estimated_cost: event.estimatedCost ?? null,
    currency: event.currency ?? null,
    duration_ms: event.durationMs,
    success: event.success,
    controlled_error_code: event.controlledErrorCode ?? null,
  } as never);
  if (result.error) throw new Error("Could not record AI usage.");
}

export async function recordAiUsage(event: AiUsageEventInput): Promise<void> {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  return recordAiUsageWithClient(createServiceRoleClient(), event);
}

export async function summarizeAiUsageWithClient(
  client: SupabaseClient<Database>,
  workspaceId: string,
) {
  const result = await client
    .from("ai_usage_events" as never)
    .select("input_tokens, output_tokens, total_tokens, estimated_cost, success")
    .eq("workspace_id" as never, workspaceId);
  const emptySummary = {
    operations: 0,
    successfulOperations: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0 as number | null,
  };
  if (result.error) {
    if (["42P01", "PGRST205"].includes(result.error.code ?? "")) return emptySummary;
    throw new Error("Could not load AI usage.");
  }
  const rows = (result.data ?? []) as unknown as Array<{
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
    estimated_cost: number | null;
    success: boolean;
  }>;
  return rows.reduce(
    (summary, row) => ({
      operations: summary.operations + 1,
      successfulOperations: summary.successfulOperations + (row.success ? 1 : 0),
      inputTokens: summary.inputTokens + (row.input_tokens ?? 0),
      outputTokens: summary.outputTokens + (row.output_tokens ?? 0),
      totalTokens: summary.totalTokens + (row.total_tokens ?? 0),
      estimatedCostUsd:
        summary.estimatedCostUsd === null || row.estimated_cost === null
          ? null
          : summary.estimatedCostUsd + row.estimated_cost,
    }),
    emptySummary,
  );
}

export async function summarizeAiUsage(workspaceId: string) {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  return summarizeAiUsageWithClient(createServiceRoleClient(), workspaceId);
}
