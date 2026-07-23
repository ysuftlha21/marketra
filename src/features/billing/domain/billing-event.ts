import { z } from "zod";
import { planIdSchema } from "@/config/plans";
import { subscriptionStatusSchema } from "./subscription";

export const normalizedBillingEventSchema = z.object({
  eventId: z.string().min(1).max(255),
  occurredAt: z.string().datetime(),
  workspaceId: z.string().uuid(),
  type: z.enum(["subscription_created", "subscription_updated", "subscription_canceled"]),
  planId: planIdSchema,
  status: subscriptionStatusSchema,
  currentPeriodStart: z.string().datetime().nullable(),
  currentPeriodEnd: z.string().datetime().nullable(),
  cancelAtPeriodEnd: z.boolean(),
});
export type NormalizedBillingEvent = z.infer<typeof normalizedBillingEventSchema>;

export function shouldApplyBillingEvent(input: {
  event: NormalizedBillingEvent;
  lastEventId?: string | null;
  lastEventAt?: string | null;
}): boolean {
  if (input.lastEventId === input.event.eventId) return false;
  if (!input.lastEventAt) return true;
  return Date.parse(input.event.occurredAt) >= Date.parse(input.lastEventAt);
}
