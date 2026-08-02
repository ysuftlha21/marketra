import { getCountry } from "@/config/countries";
import type { ProjectRow } from "@/features/projects/repository/project-repository";
import type { TargetCountrySummary } from "../repository/market-repository";

export interface CanonicalMarketContext {
  currentOperatingMarkets: string[];
  targetMarkets: Array<{ code: string; name: string; id: string }>;
  priorityRegions: string[];
  countryDataCoverage: string[];
  analyzedMarkets: string[];
  selectedActiveMarket: string | null;
}

export function normalizeCountryCodes(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return Array.from(
    new Set(
      values
        .map((entry) => String(entry).trim().toUpperCase())
        .filter((entry) => Boolean(getCountry(entry))),
    ),
  );
}

export function normalizeTextList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return Array.from(new Set(values.map((entry) => String(entry).trim()).filter(Boolean)));
}

export function resolveCanonicalMarketContext(
  project: ProjectRow,
  targetCountries: TargetCountrySummary[],
): CanonicalMarketContext {
  const additional = project.additional_context ?? {};
  const targetMarkets = Array.from(
    new Map(
      targetCountries.map((market) => [
        market.country_code.toUpperCase(),
        { code: market.country_code.toUpperCase(), name: market.country_name, id: market.id },
      ]),
    ).values(),
  );
  const active =
    targetCountries.find((market) => market.status === "selected") ??
    targetCountries.find((market) => market.status === "shortlisted") ??
    targetCountries[0] ??
    null;

  return {
    currentOperatingMarkets: normalizeCountryCodes(project.current_markets),
    targetMarkets,
    priorityRegions: normalizeTextList(additional.priorityRegions),
    countryDataCoverage: normalizeTextList(additional.countryDataCoverage),
    analyzedMarkets: targetCountries
      .filter((market) => market.has_completed_analysis)
      .map((market) => market.country_code.toUpperCase()),
    selectedActiveMarket: active?.country_code.toUpperCase() ?? null,
  };
}
