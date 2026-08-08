import { getCountry } from "@/config/countries";
import { countryMarketAnalysisResultSchema } from "../schema/market-analysis-schemas";
import type { TargetCountrySummary } from "../repository/market-repository";

export const MARKET_FILTER_VALUES = {
  region: ["all", "europe", "north-america", "asia-pacific", "latin-america", "middle-east-africa"],
  opportunity: ["all", "pursue", "investigate", "deprioritize", "pending"],
  status: ["all", "selected", "analyzing", "analyzed", "shortlisted", "rejected"],
  favorite: ["all", "favorites"],
  sort: ["recent", "alphabetical", "country-added"],
} as const;

export interface MarketWorkspaceFilters {
  q: string;
  region: (typeof MARKET_FILTER_VALUES.region)[number];
  opportunity: (typeof MARKET_FILTER_VALUES.opportunity)[number];
  status: (typeof MARKET_FILTER_VALUES.status)[number];
  favorite: (typeof MARKET_FILTER_VALUES.favorite)[number];
  sort: (typeof MARKET_FILTER_VALUES.sort)[number];
}

type FilterParams = Partial<Record<keyof MarketWorkspaceFilters, string>>;

export function normalizeMarketFilters(params: FilterParams): MarketWorkspaceFilters {
  return {
    q: params.q?.trim() ?? "",
    region: normalize(params.region, MARKET_FILTER_VALUES.region, "all"),
    opportunity: normalize(params.opportunity, MARKET_FILTER_VALUES.opportunity, "all"),
    status: normalize(params.status, MARKET_FILTER_VALUES.status, "all"),
    favorite: normalize(params.favorite, MARKET_FILTER_VALUES.favorite, "all"),
    sort: normalize(params.sort, MARKET_FILTER_VALUES.sort, "recent"),
  };
}

export function filterAndSortMarkets(
  markets: TargetCountrySummary[],
  filters: MarketWorkspaceFilters,
): TargetCountrySummary[] {
  const query = filters.q.toLocaleLowerCase("en");
  return markets
    .filter((market) => {
      const country = getCountry(market.country_code);
      const searchable = [
        market.country_name,
        market.country_code,
        country?.name ?? "",
        country?.region ?? market.region_code ?? "",
        country?.currency ?? "",
        country?.primaryLanguage ?? "",
        market.status,
        market.latest_recommendation ?? "pending",
      ]
        .join(" ")
        .toLocaleLowerCase("en");
      return (
        (!query || searchable.includes(query)) &&
        (filters.region === "all" || country?.region === filters.region) &&
        (filters.status === "all" || market.status === filters.status) &&
        (filters.opportunity === "all" ||
          (filters.opportunity === "pending"
            ? !market.latest_recommendation
            : market.latest_recommendation === filters.opportunity)) &&
        (filters.favorite === "all" || market.status === "shortlisted")
      );
    })
    .sort((left, right) => {
      if (filters.sort === "alphabetical") {
        return left.country_name.localeCompare(right.country_name, "en");
      }
      if (filters.sort === "country-added") {
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      }
      const leftDate = left.last_analyzed_at ?? left.updated_at;
      const rightDate = right.last_analyzed_at ?? right.updated_at;
      return new Date(rightDate).getTime() - new Date(leftDate).getTime();
    });
}

export function getMarketAnalysisView(market: TargetCountrySummary) {
  const parsed = countryMarketAnalysisResultSchema.safeParse(market.latest_analysis_output);
  return parsed.success ? parsed.data : null;
}

export function marketResearchLabel(market: TargetCountrySummary): string {
  if (market.latest_analysis_status === "succeeded") return "Research ready";
  if (market.latest_analysis_status === "pending" || market.latest_analysis_status === "running") {
    return "Research in progress";
  }
  if (market.latest_analysis_status === "failed") return "Research needs attention";
  return "Research not started";
}

function normalize<const T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
  fallback: T[number],
): T[number] {
  return allowed.includes(value as T[number]) ? (value as T[number]) : fallback;
}
