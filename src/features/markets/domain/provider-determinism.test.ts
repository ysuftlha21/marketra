import { describe, it, expect } from "vitest";
import { createMarketIntelligenceProvider } from "@/lib/providers/market/market.factory";
import { createAiProvider } from "@/lib/providers/ai/ai.factory";

describe("MockMarketIntelligenceProvider V1", () => {
  it("returns deterministic mock intelligence for DE", async () => {
    const p = createMarketIntelligenceProvider("mock");
    const r = await p.getCountryMarketIntelligenceV1({
      countryCode: "DE",
      countryName: "Germany",
      productSummary: "Test SaaS",
      productCategories: ["B2B"],
      assumptions: {},
    });
    expect(r.data.isMock).toBe(true);
    expect(r.data.countryCode).toBe("DE");
    expect(r.data.businessEnvironment).toBeTruthy();
    expect(r.data.limitations.length).toBeGreaterThan(0);
  });

  it("returns same output for same input", async () => {
    const p = createMarketIntelligenceProvider("mock");
    const input = {
      countryCode: "GB",
      countryName: "United Kingdom",
      productSummary: "Test",
      productCategories: [] as string[],
      assumptions: {},
    };
    const a = await p.getCountryMarketIntelligenceV1(input);
    const b = await p.getCountryMarketIntelligenceV1(input);
    expect(a.data.digitalAdoption).toBe(b.data.digitalAdoption);
  });
});

describe("MockAiProvider — analyzeCountryMarketV1", () => {
  const input = {
    countryCode: "DE",
    countryName: "Germany",
    productName: "Test SaaS",
    productSummary: "Test",
    coreProblem: "Test",
    valueProposition: "Test",
    capabilities: [],
    customerCategories: [],
    buyerRoles: [],
    businessModelInterpretation: "",
    pricingPositionInterpretation: "",
    intelligenceSummary: "",
    intelligenceBusinessEnv: "",
    intelligenceDigitalAdoption: "",
    intelligenceSaaSEnv: "",
    intelligencePaymentExpectations: "",
    intelligenceProcurementComplexity: "",
    intelligenceRegulatory: "",
    intelligenceDataProtection: "",
    intelligenceLocalization: "",
    intelligenceSalesCycle: "",
    intelligenceChannels: "",
    assumptions: {},
  };

  it("returns deterministic mock analysis", async () => {
    const p = createAiProvider("mock");
    const r = await p.analyzeCountryMarketV1(input);
    expect(r.data.isMock).toBe(true);
    expect(r.data.countryCode).toBe("DE");
    expect(r.data.entryRecommendation).toBe("investigate");
    expect(r.data.confidence).toBe("medium");
    expect(r.data.strongestFitSignals.length).toBeGreaterThan(0);
    expect(r.data.evidenceLimitations.length).toBeGreaterThan(0);
  });
});
