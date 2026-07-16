import type { MarketIntelligenceProvider } from "./market.provider";
import { MockMarketIntelligenceProvider } from "./mock-market.provider";

export type MarketIntelligenceProviderId = "mock" | "external";

export function createMarketIntelligenceProvider(
  id: MarketIntelligenceProviderId,
): MarketIntelligenceProvider {
  switch (id) {
    case "mock":
      return new MockMarketIntelligenceProvider();
    case "external":
      throw new Error(
        "External MarketIntelligenceProvider is not implemented in Phase 1. Set DEFAULT_MARKET_INTELLIGENCE_PROVIDER=mock.",
      );
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown market intelligence provider: ${String(exhaustive)}`);
    }
  }
}
