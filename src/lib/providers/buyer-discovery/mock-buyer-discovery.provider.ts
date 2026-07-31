import { buildMeta } from "../provider-types";
import type { BuyerDiscoveryProvider } from "./buyer-discovery.provider";

export class MockBuyerDiscoveryProvider implements BuyerDiscoveryProvider {
  readonly id = "mock" as const;
  async search(_input: { domain: string }) {
    const startedAt = Date.now();
    const fetchedAt = new Date(0).toISOString();
    return {
      data: {
        contacts: [
          {
            firstName: "Alex",
            lastName: "Morgan",
            fullName: "Alex Morgan",
            jobTitle: "VP of Growth",
            seniority: "executive",
            department: "marketing",
            emailAvailable: true,
            source: "mock" as const,
            fetchedAt,
          },
          {
            firstName: "Taylor",
            lastName: "Reed",
            fullName: "Taylor Reed",
            jobTitle: "Head of Sales",
            seniority: "senior",
            department: "sales",
            emailAvailable: false,
            source: "mock" as const,
            fetchedAt,
          },
        ],
        totalCount: 2,
      },
      meta: buildMeta("mock-buyer-discovery", true, startedAt),
    };
  }
  async enrichSelectedContact() {
    const startedAt = Date.now();
    return { data: null, meta: buildMeta("mock-buyer-enrichment", true, startedAt) };
  }
}
