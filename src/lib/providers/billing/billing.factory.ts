import type { BillingProvider } from "./billing.provider";
import { MockBillingProvider } from "./mock-billing.provider";

export type BillingProviderId = "mock" | "stripe" | "paytr" | "iyzico";

export function createBillingProvider(id: BillingProviderId): BillingProvider {
  switch (id) {
    case "mock":
      return new MockBillingProvider();
    case "stripe":
    case "paytr":
    case "iyzico":
      throw new Error(
        `${id} BillingProvider is not implemented in Phase 1. Set DEFAULT_BILLING_PROVIDER=mock.`,
      );
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown billing provider: ${String(exhaustive)}`);
    }
  }
}
