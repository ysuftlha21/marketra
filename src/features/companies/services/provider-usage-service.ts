import { createServiceRoleClient } from "@/lib/db/supabase-service";
import { resolveWorkspacePlan } from "@/features/workspaces/services/workspace-plan-service";
import { logOperation } from "@/lib/observability/logger";

export type DiscoveryUsageOperation =
  "company_search" | "buyer_search" | "email_find" | "email_verify";
const PLAN_LIMITS: Record<string, Record<DiscoveryUsageOperation, number>> = {
  free: { company_search: 10, buyer_search: 10, email_find: 5, email_verify: 5 },
  starter: { company_search: 100, buyer_search: 200, email_find: 100, email_verify: 100 },
  growth: { company_search: 1000, buyer_search: 2500, email_find: 1500, email_verify: 1500 },
  agency: { company_search: 5000, buyer_search: 10000, email_find: 7500, email_verify: 7500 },
};

export class ProviderUsageError extends Error {
  constructor(readonly code: "unavailable" | "limit_reached" | "record_failed") {
    super(code);
    this.name = "ProviderUsageError";
  }
}

function periodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export async function assertProviderAllowance(
  workspaceId: string,
  operation: DiscoveryUsageOperation,
) {
  const [{ plan }, client] = await Promise.all([
    resolveWorkspacePlan(workspaceId),
    Promise.resolve(createServiceRoleClient()),
  ]);
  const limit = PLAN_LIMITS[plan.id]?.[operation] ?? 0;
  const { count, error } = await client
    .from("provider_usage_events" as never)
    .select("id", { count: "exact", head: true } as never)
    .eq("workspace_id" as never, workspaceId)
    .eq("operation_type" as never, operation)
    .gte("created_at" as never, periodStart());
  if (error) throw new ProviderUsageError("unavailable");
  const used = count ?? 0;
  if (used >= limit) throw new ProviderUsageError("limit_reached");
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export async function recordProviderOperation(input: {
  workspaceId: string;
  projectId: string;
  operation: DiscoveryUsageOperation;
  providerId: string;
  operationId: string;
  idempotencyKey: string;
  success: boolean;
  errorCode?: string;
}) {
  const startedAt = Date.now();
  const client = createServiceRoleClient();
  const { error } = await client.from("provider_usage_events" as never).insert({
    workspace_id: input.workspaceId,
    project_id: input.projectId,
    operation_type: input.operation,
    provider_id: input.providerId,
    operation_id: input.operationId,
    idempotency_key: input.idempotencyKey,
    amount: 1,
    success: input.success,
    controlled_error_code: input.errorCode ?? null,
  } as never);
  if (!error || error.code === "23505") return;
  const controlledErrorCode =
    error.code === "23503"
      ? "provider_usage_context_invalid"
      : error.code === "42501"
        ? "provider_usage_permission_denied"
        : error.code === "42P01" || error.code === "PGRST205"
          ? "provider_usage_schema_unavailable"
          : /^PGRST|^5/.test(error.code ?? "")
            ? "provider_usage_service_unavailable"
            : "provider_usage_record_failed";
  logOperation({
    operationId: input.operationId,
    operation: input.operation,
    operationType: "provider_usage_record",
    providerId: input.providerId,
    durationMs: Date.now() - startedAt,
    success: false,
    controlledErrorCode,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
  });
  throw new ProviderUsageError("record_failed");
}
