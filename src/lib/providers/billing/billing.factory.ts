import type { BillingProvider } from "./billing.provider";
import { MockBillingProvider } from "./mock-billing.provider";

export type BillingProviderId = "mock" | "stripe" | "paytr" | "iyzico";

export class BillingProviderConfigError extends Error {
  constructor(id: string) {
    super(`Billing provider '${id}' is not available.`);
    this.name = "BillingProviderConfigError";
  }
}

export function createBillingProvider(id: BillingProviderId): BillingProvider {
  switch (id) {
    case "mock":
      return new MockBillingProvider();
    case "stripe":
    case "paytr":
    case "iyzico":
      throw new BillingProviderConfigError(id);
    default: {
      const exhaustive: never = id;
      throw new BillingProviderConfigError(String(exhaustive));
    }
  }
}
