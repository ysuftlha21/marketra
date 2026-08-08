import { describe, expect, it } from "vitest";
import {
  deriveDiscoveryKeywords,
  isProseString,
  normalizeDiscoveryKeywords,
} from "./discovery-keywords";

describe("isProseString", () => {
  it("detects sentence-ending punctuation as prose", () => {
    expect(isProseString("Growing number of SaaS startups.")).toBe(true);
    expect(isProseString("Need for efficient outreach solutions!")).toBe(true);
    expect(isProseString("Increase in digital strategy investments;")).toBe(true);
  });

  it("detects 5-word production ICP qualificationSignals as prose", () => {
    // These are the exact strings that caused zero-result runs in production.
    expect(isProseString("Growing number of SaaS startups")).toBe(true);
    expect(isProseString("Increase in digital strategy investments")).toBe(true);
    expect(isProseString("Need for efficient outreach solutions")).toBe(true);
  });

  it("detects excessive word count as prose", () => {
    expect(isProseString("The company is actively investing in complex digital programs")).toBe(
      true,
    );
    expect(isProseString("High usage of digital tools and platforms among target users")).toBe(
      true,
    );
  });

  it("detects strings exceeding 40 characters as prose", () => {
    expect(isProseString("A very long product category descriptor text here")).toBe(true);
  });

  it("allows concise company-category keywords", () => {
    expect(isProseString("SaaS")).toBe(false);
    expect(isProseString("B2B")).toBe(false);
    expect(isProseString("sales automation")).toBe(false);
    expect(isProseString("Revenue intelligence")).toBe(false);
    expect(isProseString("Software Development")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isProseString("")).toBe(false);
    expect(isProseString("   ")).toBe(false);
  });
});


describe("discovery keyword derivation", () => {
  it("uses only concise company descriptors", () => {
    expect(
      deriveDiscoveryKeywords({
        industries: ["SaaS", "Financial Services"],
        productCategory: "Revenue intelligence",
        companyTypes: ["B2B", "Private company"],
        userTerms: ["sales automation"],
      }),
    ).toEqual([
      "SaaS",
      "Financial Services",
      "Revenue intelligence",
      "B2B",
      "Private company",
      "sales automation",
    ]);
  });

  it("excludes qualification and purchase-signal prose at the provider boundary", () => {
    expect(
      normalizeDiscoveryKeywords([
        "High usage of digital tools and platforms among target users.",
        "The company is actively expanding into international markets",
        "workflow automation",
      ]),
    ).toEqual(["workflow automation"]);
  });

  it("excludes qualificationSignals prose — never reaches provider keywords", () => {
    expect(
      normalizeDiscoveryKeywords([
        "Growing number of SaaS startups",
        "Increase in digital strategy investments",
        "Need for efficient outreach solutions",
      ]),
    ).toEqual([]);
  });

  it("excludes purchaseTriggers prose — never reaches provider keywords", () => {
    expect(
      normalizeDiscoveryKeywords([
        "A new executive has recently joined the leadership team.",
        "The company is actively investing in complex digital transformation programs.",
      ]),
    ).toEqual([]);
  });

  it("allows an empty keyword list", () => {
    expect(deriveDiscoveryKeywords({})).toEqual([]);
  });
});
