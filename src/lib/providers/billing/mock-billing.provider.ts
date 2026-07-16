import type {
  BillingProvider,
  CheckoutInput,
  CheckoutSession,
  WebhookResult,
} from "./billing.provider";
import { getPriceForCountry } from "../../../config/pricing";
import { getCurrency, formatMoney } from "../../../config/currencies";
import type { PlanId } from "../../../config/plans";

function meta(startedAt: number) {
  return {
    providerName: "mock-billing",
    isMock: true,
    durationMs: Math.max(1, Date.now() - startedAt),
  };
}

export class MockBillingProvider implements BillingProvider {
  readonly name = "mock-billing";
  readonly isMock = true;

  async createCheckoutSession(input: CheckoutInput) {
    const startedAt = Date.now();
    const price = getPriceForCountry(input.planId, input.countryCode);
    const amount = price?.monthly ?? 0;
    const currency = price?.currency ?? "USD";
    const data: CheckoutSession = {
      isMock: true,
      sessionId: `mock_session_${input.planId}_${input.countryCode}`,
      url: `https://example.com/checkout/mock?plan=${input.planId}&country=${input.countryCode}`,
      planId: input.planId,
      amount,
      currency,
    };
    return { data, meta: meta(startedAt) };
  }

  async handleWebhook(rawBody: Uint8Array, _headers: Record<string, string>) {
    const startedAt = Date.now();
    const text = new TextDecoder().decode(rawBody);
    const data: WebhookResult = {
      isMock: true,
      verified: text.length > 0,
      event: "mock.checkout.completed",
    };
    return { data, meta: meta(startedAt) };
  }

  async billingReferenceFor(plan: PlanId, countryCode: string): Promise<string | null> {
    const price = getPriceForCountry(plan, countryCode);
    if (!price) return null;
    const currency = getCurrency(price.currency);
    return `mock://${plan}@${countryCode}:${formatMoney(price.monthly, currency?.code ?? price.currency)}`;
  }
}
