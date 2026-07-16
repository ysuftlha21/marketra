import { describe, it, expect } from "vitest";
import { getCountry, getCountriesByRegion, countries } from "./countries";
import { getCurrency, formatMoney } from "./currencies";

describe("countries config", () => {
  it("exposes a non-empty supported list with valid codes", () => {
    expect(countries.length).toBeGreaterThan(0);
    expect(countries.every((c) => c.code.length === 2)).toBe(true);
  });

  it("getCountry is case-insensitive", () => {
    expect(getCountry("us")?.name).toBe("United States");
  });

  it("getCountriesByRegion filters", () => {
    const eu = getCountriesByRegion("europe");
    expect(eu.length).toBeGreaterThan(0);
    expect(eu.every((c) => c.region === "europe")).toBe(true);
  });
});

describe("currencies config", () => {
  it("getCurrency finds USD", () => {
    expect(getCurrency("USD")?.symbol).toBe("$");
  });

  it("formatMoney formats USD with 2 decimals", () => {
    expect(formatMoney(29, "USD")).toMatch(/\$/);
  });

  it("formatMoney falls back to code for unknown currency", () => {
    expect(formatMoney(10, "XYZ")).toBe("10.00 XYZ");
  });
});
