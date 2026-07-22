import { describe, expect, it } from "vitest";
import { manualCompanySchema } from "./manual-company-schema";

const base = {
  projectSlug: "acme",
  targetCountryId: "00000000-0000-4000-8000-000000000001",
  companyName: " Acme GmbH ",
  countryCode: "de",
  industry: " SaaS ",
};

describe("manual company validation", () => {
  it("trims fields, normalizes country, and parses signals", () => {
    const parsed = manualCompanySchema.parse({
      ...base,
      technologySignals: "AWS, HubSpot",
      employeeMin: "",
      employeeMax: "50",
    });
    expect(parsed.companyName).toBe("Acme GmbH");
    expect(parsed.countryCode).toBe("DE");
    expect(parsed.technologySignals).toEqual(["AWS", "HubSpot"]);
    expect(parsed.employeeMin).toBeUndefined();
  });
  it("rejects invalid URLs and reversed employee ranges", () => {
    expect(manualCompanySchema.safeParse({ ...base, websiteUrl: "localhost" }).success).toBe(false);
    expect(
      manualCompanySchema.safeParse({ ...base, employeeMin: 100, employeeMax: 10 }).success,
    ).toBe(false);
  });
});
