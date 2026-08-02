import { describe, expect, it } from "vitest";
import type { CompanyDiscoveryInputV1 } from "../company-discovery/company-discovery.provider";
import {
  buildHunterDiscoverBody,
  hunterHeadcountBuckets,
  normalizeHunterIndustries,
  normalizeHunterTechnologies,
} from "./hunter-discovery-request";

function input(overrides: Partial<CompanyDiscoveryInputV1> = {}): CompanyDiscoveryInputV1 {
  return {
    correlationId: "safe-operation",
    targetCountryCode: "us",
    industries: ["Software as a Service (SaaS)"],
    companyTypes: [],
    qualificationSignals: [],
    disqualificationSignals: [],
    purchaseTriggers: [],
    technologySignals: [],
    exclusionDomains: [],
    maxResults: 5,
    ...overrides,
  };
}

describe("Hunter Discover request mapping", () => {
  it("normalizes country, SaaS industry, employee range and keywords", () => {
    expect(
      buildHunterDiscoverBody(
        input({
          companySizeMinEmployees: 1,
          companySizeMaxEmployees: 200,
          keywords: [" cloud ", "Cloud", "workflow"],
        }),
      ),
    ).toEqual({
      headquarters_location: { include: [{ country: "US" }] },
      industry: { include: ["Software Development"] },
      headcount: ["1-10", "11-50", "51-200"],
      keywords: { include: ["cloud", "workflow"], match: "any" },
    });
  });

  it("maps the controlled smoke employee range", () => {
    expect(hunterHeadcountBuckets(11, 50)).toEqual(["11-50"]);
  });

  it("omits unsupported industries and optional technology prose", () => {
    const body = buildHunterDiscoverBody(
      input({
        industries: ["Unverified Custom Vertical"],
        technologySignals: ["High usage of digital tools and platforms among target users."],
      }),
    );
    expect(body).not.toHaveProperty("industry");
    expect(body).not.toHaveProperty("technology");
  });

  it("maps only concrete supported technology names", () => {
    expect(normalizeHunterTechnologies(["HubSpot", "AWS", "React", "unknown platform"])).toEqual([
      "hubspot",
      "amazon-ec2",
      "react-js",
    ]);
    expect(normalizeHunterIndustries(["SaaS", "SaaS"])).toEqual(["Software Development"]);
  });
});
