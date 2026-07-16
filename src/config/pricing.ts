import { z } from "zod";
import { planIdSchema, plans, type PlanId } from "./plans";

/** Simplified global USD country price record. Retained for BillingProvider
 *  backward compatibility (provider interfaces reference this shape) and
 *  market-analysis currency configuration (unaffected). */
export const countryPriceSchema = z.object({
  countryCode: z.string().length(2),
  regionFallback: z.string().optional(),
  currency: z.string().length(3),
  monthly: z.number().nonnegative(),
  annual: z.number().nonnegative(),
  billingProviderPriceRef: z.string().optional(),
  active: z.boolean().default(true),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
});
export type CountryPrice = z.infer<typeof countryPriceSchema>;

export const planPriceMapSchema = z.record(planIdSchema, z.array(countryPriceSchema));
export type PlanPriceMap = z.infer<typeof planPriceMapSchema>;

function price(plan: PlanId, monthly: number, annual: number): CountryPrice {
  return {
    countryCode: "US",
    currency: "USD",
    monthly,
    annual,
    active: true,
    billingProviderPriceRef: `usd_${plan}`,
  };
}

/** Global USD-only pricing. One price entry per plan. */
export const mockPricing: PlanPriceMap = {
  free: [price("free", 0, 0)],
  starter: [price("starter", 29, 290)],
  growth: [price("growth", 79, 790)],
  agency: [price("agency", 199, 1990)],
};

/** Resolves a plan price. countryCode is accepted for backward compat
 *  with BillingProvider but always returns the global USD price. */
export function getPriceForCountry(
  planId: PlanId,
  _countryCode?: string,
): CountryPrice | undefined {
  return mockPricing[planId]?.[0];
}

export function getPricesForPlan(planId: PlanId): readonly CountryPrice[] {
  return mockPricing[planId] ?? [];
}

/** Returns the global USD monthly price for a plan. */
export function getMonthlyPrice(planId: PlanId): number {
  return plans.find((p) => p.id === planId)?.monthlyPrice ?? 0;
}

/** Formats a USD amount for display. */
export function formatUsd(amount: number): string {
  return amount === 0 ? "$0" : `$${amount}`;
}
