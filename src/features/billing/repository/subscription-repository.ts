import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import {
  workspaceSubscriptionProviderMetadataSchema,
  workspaceSubscriptionStateSchema,
  type WorkspaceSubscriptionProviderMetadata,
  type WorkspaceSubscriptionState,
} from "../domain/subscription";

export async function findWorkspaceSubscriptionWithClient(
  client: SupabaseClient<Database>,
  workspaceId: string,
): Promise<WorkspaceSubscriptionState | null> {
  const result = await client
    .from("workspace_subscription_states" as never)
    .select("*")
    .eq("workspace_id" as never, workspaceId)
    .maybeSingle();
  if (result.error) {
    if (["42P01", "PGRST205"].includes(result.error.code ?? "")) return null;
    throw new Error("Could not resolve workspace subscription.");
  }
  if (!result.data) return null;
  const parsed = workspaceSubscriptionStateSchema.safeParse(result.data);
  if (!parsed.success) throw new Error("Workspace subscription data is invalid.");
  return parsed.data;
}

/** Use only with a trusted service-role client inside billing provider/webhook code. */
export async function findWorkspaceSubscriptionProviderMetadataWithClient(
  client: SupabaseClient<Database>,
  workspaceId: string,
): Promise<WorkspaceSubscriptionProviderMetadata | null> {
  const result = await client
    .from("workspace_subscriptions" as never)
    .select("workspace_id, billing_provider, external_customer_id, external_subscription_id")
    .eq("workspace_id" as never, workspaceId)
    .maybeSingle();
  if (result.error) throw new Error("Could not resolve billing provider metadata.");
  if (!result.data) return null;
  const parsed = workspaceSubscriptionProviderMetadataSchema.safeParse(result.data);
  if (!parsed.success) throw new Error("Billing provider metadata is invalid.");
  return parsed.data;
}

export async function findWorkspaceSubscription(workspaceId: string) {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  return findWorkspaceSubscriptionWithClient(createServiceRoleClient(), workspaceId);
}
