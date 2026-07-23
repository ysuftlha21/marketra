import { describe, expect, it } from "vitest";
import { normalizedBillingEventSchema, shouldApplyBillingEvent } from "./billing-event";

const event = normalizedBillingEventSchema.parse({
  eventId: "event-1",
  occurredAt: "2026-07-23T10:00:00.000Z",
  workspaceId: "00000000-0000-4000-8000-000000000001",
  type: "subscription_updated",
  planId: "growth",
  status: "active",
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
});

describe("billing webhook normalization boundary", () => {
  it("rejects duplicate and stale events", () => {
    expect(shouldApplyBillingEvent({ event, lastEventId: "event-1" })).toBe(false);
    expect(shouldApplyBillingEvent({ event, lastEventAt: "2026-07-23T11:00:00.000Z" })).toBe(false);
  });
  it("accepts a newer verified normalized event", () => {
    expect(shouldApplyBillingEvent({ event, lastEventAt: "2026-07-23T09:00:00.000Z" })).toBe(true);
  });
});
