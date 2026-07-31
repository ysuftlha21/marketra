import { describe, expect, it } from "vitest";
import { calculateHunterPreScore } from "./hunter-pre-score";

describe("calculateHunterPreScore", () => {
  it("is deterministic and explains matched signals", () => {
    const candidate = {
      name: "Acme",
      normalizedName: "acme",
      countryCode: "DE",
      industry: "SaaS",
      industryTags: [],
      employeeCountEstimate: 50,
      annualRevenueCurrency: "USD",
      technologySignals: ["React"],
      growthSignals: [],
      normalizedDomain: "acme.com",
      warnings: [],
    };
    const target = {
      countryCode: "DE",
      industries: ["SaaS"],
      employeeMin: 10,
      employeeMax: 100,
      technologies: ["React"],
    };
    expect(calculateHunterPreScore(candidate, target)).toEqual(
      calculateHunterPreScore(candidate, target),
    );
    expect(calculateHunterPreScore(candidate, target)).toMatchObject({
      score: 100,
      confidence: "high",
    });
  });

  it("reports low confidence rather than inventing missing facts", () => {
    const candidate = {
      name: "Acme",
      normalizedName: "acme",
      countryCode: "DE",
      industry: "Unknown",
      industryTags: [],
      annualRevenueCurrency: "USD",
      technologySignals: [],
      growthSignals: [],
      warnings: [],
    };
    expect(
      calculateHunterPreScore(candidate, { countryCode: "DE", industries: ["SaaS"] }).confidence,
    ).toBe("low");
  });
});
