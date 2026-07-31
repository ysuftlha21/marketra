import type {
  CompanyDiscoveryProvider,
  CompanyDiscoveryProviderId,
} from "./company-discovery.provider";
import { MockCompanyDiscoveryProvider } from "./mock-company-discovery.provider";
import { HunterCompanyDiscoveryProvider } from "../hunter/hunter-company-discovery.provider";
import type { HunterClient } from "../hunter/hunter-client";

export function createCompanyDiscoveryProvider(
  id: CompanyDiscoveryProviderId,
  options?: { hunterClient?: HunterClient },
): CompanyDiscoveryProvider {
  switch (id) {
    case "mock":
      return new MockCompanyDiscoveryProvider();
    case "external":
      throw new Error(
        "External CompanyDiscoveryProvider is not implemented in Phase 6. " +
          "Set DEFAULT_COMPANY_DISCOVERY_PROVIDER=mock to use the mock provider.",
      );
    case "hunter":
      if (!options?.hunterClient) throw new Error("Hunter company discovery is not configured.");
      return new HunterCompanyDiscoveryProvider(options.hunterClient);
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown company discovery provider: ${String(exhaustive)}`);
    }
  }
}
