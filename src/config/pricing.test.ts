import { describe, it, expect } from "vitest";
import {
  getPriceForCountry,
  getPricesForPlan,
  mockPricing,
  formatUsd,
  getMonthlyPrice,
} from "./pricing";
import type { PlanId } from "./plans";

describe("mockPricing", () => {
  it("has exactly four plans", () => {
    const ids = Object.keys(mockPricing);
    expect(ids).toHaveLength(4);
  });

  it("each plan has exactly one USD price entry", () => {
    for (const planId of Object.keys(mockPricing) as PlanId[]) {
      const entries = mockPricing[planId];
      expect(entries).toHaveLength(1);
      expect(entries[0]?.currency).toBe("USD");
    }
  });

  it("no non-USD currencies present", () => {
    for (const planId of Object.keys(mockPricing) as PlanId[]) {
      for (const price of mockPricing[planId]) {
        expect(price.currency).toBe("USD");
      }
    }
  });

  it("correct global USD prices", () => {
    expect(mockPricing.free?.[0]?.monthly).toBe(0);
    expect(mockPricing.starter?.[0]?.monthly).toBe(29);
    expect(mockPricing.growth?.[0]?.monthly).toBe(79);
    expect(mockPricing.agency?.[0]?.monthly).toBe(199);
  });
});

describe("getPriceForCountry", () => {
  it("returns USD price regardless of country code", () => {
    const p = getPriceForCountry("growth", "DE");
    expect(p?.currency).toBe("USD");
    expect(p?.countryCode).toBe("US");
  });

  it("returns price for valid plan", () => {
    expect(getPriceForCountry("starter", "GB")?.monthly).toBe(29);
  });
});

describe("getPricesForPlan", () => {
  it("returns exactly one entry per plan", () => {
    expect(getPricesForPlan("growth")).toHaveLength(1);
  });
});

describe("getMonthlyPrice", () => {
  it("returns correct monthly prices", () => {
    expect(getMonthlyPrice("free")).toBe(0);
    expect(getMonthlyPrice("starter")).toBe(29);
    expect(getMonthlyPrice("growth")).toBe(79);
    expect(getMonthlyPrice("agency")).toBe(199);
  });
});

describe("formatUsd", () => {
  it("formats $0 correctly", () => {
    expect(formatUsd(0)).toBe("$0");
  });
  it("formats positive amounts", () => {
    expect(formatUsd(29)).toBe("$29");
    expect(formatUsd(199)).toBe("$199");
  });
});
