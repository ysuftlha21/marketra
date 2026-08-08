import { describe, expect, it } from "vitest";
import type { CompanyDiscoveryInputV1 } from "../company-discovery/company-discovery.provider";
import {
  buildHunterDiscoverBody,
  buildHunterFilterSnapshot,
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

  it("never converts qualification or purchase-signal prose into keywords", () => {
    const body = buildHunterDiscoverBody(
      input({
        companySizeMinEmployees: 11,
        companySizeMaxEmployees: 50,
        qualificationSignals: [
          "The company is actively investing in complex digital transformation programs.",
        ],
        purchaseTriggers: ["A new executive has recently joined the leadership team."],
      }),
    );
    expect(body).toEqual({
      headquarters_location: { include: [{ country: "US" }] },
      industry: { include: ["Software Development"] },
      headcount: ["11-50"],
    });
  });

  it("drops sentence-like user terms and allows industry/headcount-only discovery", () => {
    const body = buildHunterDiscoverBody(
      input({
        companySizeMinEmployees: 11,
        companySizeMaxEmployees: 50,
        keywords: ["High usage of digital tools and platforms among target users."],
      }),
    );
    expect(body).not.toHaveProperty("keywords");
    expect(body).toHaveProperty("industry.include", ["Software Development"]);
    expect(body).toHaveProperty("headcount", ["11-50"]);
  });

  it("defaults multiple keywords to any and honors an explicit all selection", () => {
    expect(
      buildHunterDiscoverBody(input({ keywords: ["sales automation", "B2B"] })).keywords,
    ).toEqual({ include: ["sales automation", "B2B"], match: "any" });
    expect(
      buildHunterDiscoverBody(
        input({
          keywords: ["sales automation", "B2B"],
          keywordMatchMode: "all",
        }),
      ).keywords,
    ).toEqual({ include: ["sales automation", "B2B"], match: "all" });
  });

  it("records submitted versus normalized filters without restoring cleared fields", () => {
    const snapshot = buildHunterFilterSnapshot(
      input({
        companySizeMinEmployees: 11,
        companySizeMaxEmployees: 50,
        keywords: [],
        keywordSubmissionState: "empty",
        technologySignals: [],
        technologySubmissionState: "empty",
      }),
      "00000000-0000-4000-a000-000000000001",
    );
    expect(snapshot).toMatchObject({
      countryCode: "US",
      industries: ["Software Development"],
      employeeRanges: ["11-50"],
      keywords: [],
      technologies: [],
      resultCap: 5,
      page: 1,
    });
    expect(snapshot.omittedFilters).toEqual(
      expect.arrayContaining([
        { field: "keywords", reason: "explicitly_empty" },
        { field: "technologies", reason: "explicitly_empty" },
      ]),
    );
  });

  it('maps UI "Software as a Service (SaaS)" to Hunter "Software Development"', () => {
    const body = buildHunterDiscoverBody(
      input({ industries: ["Software as a Service (SaaS)"] }),
    );
    expect(body.industry).toEqual({ include: ["Software Development"] });
  });

  it("omittedFilters labels absent fields as not_submitted", () => {
    const snapshot = buildHunterFilterSnapshot(
      input({ industries: [], keywords: undefined, technologySignals: [] }),
      "00000000-0000-4000-a000-000000000002",
    );
    expect(snapshot.omittedFilters).toEqual(
      expect.arrayContaining([
        { field: "industry", reason: "not_submitted" },
        { field: "keywords", reason: "not_submitted" },
      ]),
    );
  });

  it("controlled smoke request: US, Software Development, 11–50, limit 5, no keywords or technologies", () => {
    const body = buildHunterDiscoverBody(
      input({
        industries: ["Software as a Service (SaaS)"],
        companySizeMinEmployees: 11,
        companySizeMaxEmployees: 50,
        keywords: undefined,
        technologySignals: [],
        maxResults: 5,
      }),
    );
    expect(body).toEqual({
      headquarters_location: { include: [{ country: "US" }] },
      industry: { include: ["Software Development"] },
      headcount: ["11-50"],
      // keywords omitted — no user keywords submitted
      // technology omitted — no concrete technology submitted
    });
    expect(body).not.toHaveProperty("keywords");
    expect(body).not.toHaveProperty("technology");
  });
});
