import { buildMeta } from "../provider-types";
import type { BuyerDiscoveryProvider } from "./buyer-discovery.provider";

export class MockBuyerDiscoveryProvider implements BuyerDiscoveryProvider {
  readonly id = "mock" as const;
  async search() {
    const startedAt = Date.now();
    return {
      data: { contacts: [], totalCount: 0 },
      meta: buildMeta("mock-buyer-discovery", true, startedAt),
    };
  }
  async enrichSelectedContact() {
    const startedAt = Date.now();
    return { data: null, meta: buildMeta("mock-buyer-enrichment", true, startedAt) };
  }
}
