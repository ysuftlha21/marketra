import { describe, expect, it } from "vitest";
import { normalizeCountryCodes, resolveCanonicalMarketContext } from "./market-context";
import type { ProjectRow } from "@/features/projects/repository/project-repository";
import type { TargetCountrySummary } from "../repository/market-repository";

describe("canonical market context", () => {
  it("normalizes legacy comma-separated countries and deduplicates ISO codes", () => {
    expect(normalizeCountryCodes(" us,DE,us,unknown ")).toEqual(["US", "DE"]);
  });

  it("keeps operating, target, priority and coverage concepts distinct", () => {
    const project = {
      current_markets: ["US", "US"],
      additional_context: {
        priorityRegions: "DACH, Western Europe, DACH",
        countryDataCoverage: "US, Canada",
      },
    } as unknown as ProjectRow;
    const targets = [
      {
        id: "target-de",
        country_code: "DE",
        country_name: "Germany",
        status: "selected",
        has_completed_analysis: true,
      },
    ] as TargetCountrySummary[];

    expect(resolveCanonicalMarketContext(project, targets)).toMatchObject({
      currentOperatingMarkets: ["US"],
      targetMarkets: [{ code: "DE", name: "Germany", id: "target-de" }],
      priorityRegions: ["DACH", "Western Europe"],
      countryDataCoverage: ["US", "Canada"],
      analyzedMarkets: ["DE"],
      selectedActiveMarket: "DE",
    });
  });
});
