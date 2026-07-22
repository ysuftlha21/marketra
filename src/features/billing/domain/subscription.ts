import { z } from "zod";
import { planIdSchema } from "@/config/plans";

export const subscriptionStatusSchema = z.enum([
  "free",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const workspaceSubscriptionSchema = z.object({
  workspace_id: z.string().uuid(),
  plan_id: planIdSchema,
  subscription_status: subscriptionStatusSchema,
  billing_provider: z.string().min(1),
  external_customer_id: z.string().nullable(),
  external_subscription_id: z.string().nullable(),
  current_period_start: z.string().datetime().nullable(),
  current_period_end: z.string().datetime().nullable(),
  cancel_at_period_end: z.boolean(),
  canceled_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type WorkspaceSubscription = z.infer<typeof workspaceSubscriptionSchema>;
