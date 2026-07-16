import { describe, it, expect } from "vitest";
import { createAiProvider } from "@/lib/providers/ai/ai.factory";
import {
  countrySpecificIcpResultSchema,
  type CountrySpecificIcpInput,
} from "@/lib/providers/ai/ai.provider";

const mockInput: CountrySpecificIcpInput = {
  countryCode: "DE",
  countryName: "Germany",
  productName: "TestFlow",
  productDescription: "A test SaaS",
  productSummary: "Summary",
  coreProblem: "Problem",
  valueProposition: "Value",
  capabilities: ["c1"],
  customerCategories: ["B2B"],
  buyerRoles: ["CEO"],
  userRoles: ["dev"],
  adoptionBarriers: [],
  purchaseTriggers: [],
  marketRecommendation: "investigate",
  marketConfidence: "medium",
  strongestFitSignals: [],
  weakestFitSignals: [],
  relevantCustomerSegments: [],
  localizationRequirements: "",
  acquisitionChannels: [],
  regulatoryConsiderations: "",
  operationalChallenges: [],
  unresolvedQuestions: [],
  countryRegion: "europe",
};

describe("MockAiProvider — generateCountrySpecificIcpV1", () => {
  it("returns deterministic mock ICP", async () => {
    const p = createAiProvider("mock");
    const r = await p.generateCountrySpecificIcpV1(mockInput);
    expect(r.data.isMock).toBe(true);
    expect(r.data.countryCode).toBe("DE");
    expect(r.data.profileName).toBeTruthy();
    expect(r.data.primaryIndustries.length).toBeGreaterThan(0);
    expect(r.data.buyerRoles.length).toBeGreaterThan(0);
    expect(r.data.confidence).toBe("medium");
    expect(r.data.assumptions.length).toBeGreaterThan(0);
  });

  it("validates against output schema", () => {
    const p = createAiProvider("mock");
    p.generateCountrySpecificIcpV1(mockInput).then((r) => {
      expect(countrySpecificIcpResultSchema.safeParse(r.data).success).toBe(true);
    });
  });

  it("returns same output for same input", async () => {
    const p = createAiProvider("mock");
    const a = await p.generateCountrySpecificIcpV1(mockInput);
    const b = await p.generateCountrySpecificIcpV1(mockInput);
    expect(a.data.summary).toBe(b.data.summary);
  });
});
