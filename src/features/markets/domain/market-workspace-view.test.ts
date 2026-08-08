import { describe, expect, it } from "vitest";
import type { TargetCountrySummary } from "../repository/market-repository";
import { filterAndSortMarkets, normalizeMarketFilters } from "./market-workspace-view";

function market(overrides: Partial<TargetCountrySummary>): TargetCountrySummary {
  return {
    id: "country-1",
    country_code: "DE",
    country_name: "Germany",
    region_code: "europe",
    status: "selected",
    priority: null,
    notes: null,
    added_by: "user-1",
    shortlisted_at: null,
    rejected_at: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    latest_analysis_status: null,
    latest_recommendation: null,
    latest_confidence: null,
    latest_analysis_output: null,
    last_analyzed_at: null,
    has_completed_analysis: false,
    ...overrides,
  };
}

describe("market workspace filters", () => {
  it("normalizes unsupported query parameters safely", () => {
    expect(normalizeMarketFilters({ region: "unknown", sort: "invalid", q: " Germany " })).toEqual(
      expect.objectContaining({ region: "all", sort: "recent", q: "Germany" }),
    );
  });

  it("searches by country metadata and filters shortlist favorites", () => {
    const result = filterAndSortMarkets(
      [
        market({ status: "shortlisted" }),
        market({ id: "country-2", country_code: "US", country_name: "United States" }),
      ],
      normalizeMarketFilters({ q: "EUR", favorite: "favorites" }),
    );

    expect(result.map((item) => item.country_code)).toEqual(["DE"]);
  });

  it("filters the deterministic opportunity recommendation without inventing scores", () => {
    const result = filterAndSortMarkets(
      [
        market({ latest_recommendation: "pursue" }),
        market({ id: "country-2", country_code: "US" }),
      ],
      normalizeMarketFilters({ opportunity: "pending" }),
    );

    expect(result.map((item) => item.id)).toEqual(["country-2"]);
  });
});
