import { z } from "zod";
import type { ProviderResult } from "../provider-types";
import { planIdSchema, type PlanId } from "../../../config/plans";
import { countryCodeSchema } from "../../../config/countries";

export const checkoutInputSchema = z.object({
  planId: planIdSchema,
  countryCode: countryCodeSchema,
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const checkoutSessionSchema = z.object({
  isMock: z.boolean(),
  sessionId: z.string().min(1),
  url: z.string().url(),
  planId: planIdSchema,
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
});
export type CheckoutSession = z.infer<typeof checkoutSessionSchema>;

export const webhookResultSchema = z.object({
  isMock: z.boolean(),
  verified: z.boolean(),
  event: z.string(),
  planId: planIdSchema.optional(),
});
export type WebhookResult = z.infer<typeof webhookResultSchema>;

export interface BillingProvider {
  readonly name: string;
  readonly isMock: boolean;
  createCheckoutSession(input: CheckoutInput): Promise<ProviderResult<CheckoutSession>>;
  handleWebhook(
    rawBody: Uint8Array,
    headers: Record<string, string>,
  ): Promise<ProviderResult<WebhookResult>>;
  billingReferenceFor(plan: PlanId, countryCode: string): Promise<string | null>;
}
