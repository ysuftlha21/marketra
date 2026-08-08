import { describe, expect, it } from "vitest";
import { restoreSubmittedDiscoveryFilters } from "./discovery-filter-snapshot";

describe("discovery submitted-filter restoration", () => {
  it("preserves explicit empty keyword and technology fields", () => {
    expect(
      restoreSubmittedDiscoveryFilters({
        submittedFilters: {
          industry: { state: "populated", value: "SaaS" },
          keywords: { state: "empty", values: [] },
          technologies: { state: "empty", values: [] },
          keywordMatchMode: "any",
          resultCap: 5,
          page: 1,
        },
      }),
    ).toMatchObject({ keywords: [], technologies: [], keywordMatchMode: "any" });
  });

  it("distinguishes absent fields and ignores unsafe legacy snapshots", () => {
    expect(
      restoreSubmittedDiscoveryFilters({
        submittedFilters: {
          industry: { state: "absent" },
          keywords: { state: "absent" },
          technologies: { state: "absent" },
        },
      }),
    ).toMatchObject({ industry: undefined, keywords: undefined, technologies: undefined });
    expect(
      restoreSubmittedDiscoveryFilters({
        filters: { keywords: ["Growing number of SaaS startups"] },
      }),
    ).toBeNull();
  });

  it("sanitizes ICP qualificationSignals prose from legacy keyword snapshots", () => {
    const result = restoreSubmittedDiscoveryFilters({
      submittedFilters: {
        industry: { state: "populated", value: "Software as a Service (SaaS)" },
        keywords: {
          state: "populated",
          values: [
            "Growing number of SaaS startups",
            "Increase in digital strategy investments",
            "Need for efficient outreach solutions",
          ],
        },
        technologies: { state: "populated", values: ["HubSpot"] },
        keywordMatchMode: "any",
        resultCap: 5,
        page: 1,
      },
    });
    // All three are prose and must be removed; result is an empty array (not undefined)
    expect(result?.keywords).toEqual([]);
    // Concrete tech name must survive
    expect(result?.technologies).toEqual(["HubSpot"]);
  });

  it("preserves concise short keywords from populated legacy snapshots", () => {
    const result = restoreSubmittedDiscoveryFilters({
      submittedFilters: {
        keywords: {
          state: "populated",
          values: ["sales automation", "B2B", "SaaS"],
        },
        technologies: { state: "absent" },
        keywordMatchMode: "all",
        resultCap: 10,
        page: 1,
      },
    });
    expect(result?.keywords).toEqual(["sales automation", "B2B", "SaaS"]);
    expect(result?.keywordMatchMode).toBe("all");
  });

  it("strips prose technology summaries from legacy snapshots", () => {
    const result = restoreSubmittedDiscoveryFilters({
      submittedFilters: {
        keywords: { state: "absent" },
        technologies: {
          state: "populated",
          values: [
            "High usage of digital tools and platforms among target users.",
            "HubSpot",
            "AWS",
          ],
        },
        keywordMatchMode: "any",
        resultCap: 5,
        page: 1,
      },
    });
    expect(result?.keywords).toBeUndefined();
    expect(result?.technologies).toEqual(["HubSpot", "AWS"]);
  });

  it("maxResults defaults to 5 when absent or invalid", () => {
    const result = restoreSubmittedDiscoveryFilters({
      submittedFilters: {
        keywords: { state: "absent" },
        technologies: { state: "absent" },
        keywordMatchMode: "any",
      },
    });
    expect(result?.maxResults).toBe(5);
    expect(result?.page).toBe(1);
  });
});
