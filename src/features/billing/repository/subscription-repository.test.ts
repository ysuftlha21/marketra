import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import {
  findWorkspaceSubscriptionProviderMetadataWithClient,
  findWorkspaceSubscriptionWithClient,
} from "./subscription-repository";

const safeState = {
  workspace_id: "00000000-0000-4000-8000-000000000001",
  plan_id: "growth",
  subscription_status: "active",
  billing_provider: "stripe",
  current_period_start: null,
  current_period_end: null,
  cancel_at_period_end: false,
  canceled_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function clientReturning(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient<Database>, from, select };
}

describe("subscription repository boundaries", () => {
  it("ordinary reads use the safe projection and never select provider identifiers", async () => {
    const { client, from, select } = clientReturning(safeState);
    await expect(
      findWorkspaceSubscriptionWithClient(client, safeState.workspace_id),
    ).resolves.toEqual(safeState);
    expect(from).toHaveBeenCalledWith("workspace_subscription_states");
    expect(select).toHaveBeenCalledWith("*");
    expect(
      JSON.stringify(await findWorkspaceSubscriptionWithClient(client, safeState.workspace_id)),
    ).not.toMatch(/external_customer_id|external_subscription_id/);
  });

  it("trusted billing access selects only the required provider metadata", async () => {
    const metadata = {
      workspace_id: safeState.workspace_id,
      billing_provider: "stripe",
      external_customer_id: "customer-reference",
      external_subscription_id: "subscription-reference",
    };
    const { client, from, select } = clientReturning(metadata);
    await expect(
      findWorkspaceSubscriptionProviderMetadataWithClient(client, safeState.workspace_id),
    ).resolves.toEqual(metadata);
    expect(from).toHaveBeenCalledWith("workspace_subscriptions");
    expect(select).toHaveBeenCalledWith(
      "workspace_id, billing_provider, external_customer_id, external_subscription_id",
    );
  });
});
