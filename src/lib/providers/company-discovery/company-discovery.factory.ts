import type {
  CompanyDiscoveryProvider,
  CompanyDiscoveryProviderId,
} from "./company-discovery.provider";
import { MockCompanyDiscoveryProvider } from "./mock-company-discovery.provider";

export function createCompanyDiscoveryProvider(
  id: CompanyDiscoveryProviderId,
): CompanyDiscoveryProvider {
  switch (id) {
    case "mock":
      return new MockCompanyDiscoveryProvider();
    case "external":
      throw new Error(
        "External CompanyDiscoveryProvider is not implemented in Phase 6. " +
          "Set DEFAULT_COMPANY_DISCOVERY_PROVIDER=mock to use the mock provider.",
      );
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown company discovery provider: ${String(exhaustive)}`);
    }
  }
}
