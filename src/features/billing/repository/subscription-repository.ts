import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { workspaceSubscriptionSchema, type WorkspaceSubscription } from "../domain/subscription";

export async function findWorkspaceSubscriptionWithClient(
  client: SupabaseClient<Database>,
  workspaceId: string,
): Promise<WorkspaceSubscription | null> {
  const result = await client
    .from("workspace_subscriptions" as never)
    .select("*")
    .eq("workspace_id" as never, workspaceId)
    .maybeSingle();
  if (result.error) {
    if (["42P01", "PGRST205"].includes(result.error.code ?? "")) return null;
    throw new Error("Could not resolve workspace subscription.");
  }
  if (!result.data) return null;
  const parsed = workspaceSubscriptionSchema.safeParse(result.data);
  if (!parsed.success) throw new Error("Workspace subscription data is invalid.");
  return parsed.data;
}

export async function findWorkspaceSubscription(workspaceId: string) {
  const { createServiceRoleClient } = await import("@/lib/db/supabase-service");
  return findWorkspaceSubscriptionWithClient(createServiceRoleClient(), workspaceId);
}
