import { describe, it, expect } from "vitest";
import { createMarketIntelligenceProvider } from "./market.factory";
import { MockMarketIntelligenceProvider } from "./mock-market.provider";

describe("createMarketIntelligenceProvider", () => {
  it("creates a MockMarketIntelligenceProvider for 'mock'", () => {
    const p = createMarketIntelligenceProvider("mock");
    expect(p).toBeInstanceOf(MockMarketIntelligenceProvider);
    expect(p.isMock).toBe(true);
  });

  it("throws for 'external' (not implemented in Phase 1)", () => {
    expect(() => createMarketIntelligenceProvider("external")).toThrow(
      /External MarketIntelligenceProvider is not implemented/,
    );
  });
});
