import { describe, expect, it } from "vitest";
import { resolveSubscriptionPlan } from "./workspace-plan-service";
import type { WorkspaceSubscription } from "@/features/billing/domain/subscription";

function subscription(overrides: Partial<WorkspaceSubscription> = {}): WorkspaceSubscription {
  return {
    workspace_id: "00000000-0000-4000-8000-000000000001",
    plan_id: "growth",
    subscription_status: "active",
    billing_provider: "stripe",
    external_customer_id: null,
    external_subscription_id: null,
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    canceled_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("workspace plan resolution", () => {
  it("falls back to Free without a persisted subscription", () => {
    expect(resolveSubscriptionPlan(null)).toMatchObject({
      usedFallback: true,
      plan: { id: "free" },
    });
  });
  it("resolves an active persisted plan", () => {
    expect(resolveSubscriptionPlan(subscription())).toMatchObject({
      usedFallback: false,
      plan: { id: "growth" },
    });
  });
  it("does not grant a canceled paid plan", () => {
    expect(
      resolveSubscriptionPlan(subscription({ subscription_status: "canceled" })),
    ).toMatchObject({ usedFallback: true, plan: { id: "free" } });
  });
});
