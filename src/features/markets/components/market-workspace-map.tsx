import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import type { TargetCountrySummary } from "../repository/market-repository";

const numericCountryCodes: Record<string, string> = {
  "036": "AU",
  "076": "BR",
  "124": "CA",
  "250": "FR",
  "276": "DE",
  "356": "IN",
  "380": "IT",
  "392": "JP",
  "528": "NL",
  "724": "ES",
  "792": "TR",
  "826": "GB",
  "840": "US",
};

const topology = world as unknown as Topology<{ countries: GeometryCollection }>;
const geography = feature(topology, topology.objects.countries) as FeatureCollection<Geometry>;
const projection = geoNaturalEarth1().fitExtent(
  [
    [12, 10],
    [908, 360],
  ],
  geography,
);
const path = geoPath(projection);

export function MarketWorkspaceMap({
  markets,
  projectSlug,
}: {
  markets: TargetCountrySummary[];
  projectSlug: string;
}) {
  const marketByCode = new Map(markets.map((market) => [market.country_code, market]));
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Target market map</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Selected markets are highlighted. Choose one to open its intelligence workspace.
          </p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground sm:mt-0">{markets.length} selected</p>
      </div>
      <div className="bg-muted/10 p-3 sm:p-5">
        <svg
          viewBox="0 0 920 370"
          className="h-auto w-full"
          role="img"
          aria-label="World map of selected target markets"
        >
          {geography.features.map((geographyItem, index) => {
            const id =
              geographyItem.id === undefined ? "" : String(geographyItem.id).padStart(3, "0");
            const market = marketByCode.get(numericCountryCodes[id] ?? "");
            const d = path(geographyItem);
            if (!d) return null;
            const shape = (
              <path
                d={d}
                fill={market ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                fillOpacity={market ? 0.8 : 0.5}
                stroke="hsl(var(--border))"
                strokeWidth={market ? 0.9 : 0.45}
                className={market ? "transition-opacity duration-150 hover:opacity-75" : undefined}
              />
            );
            return market ? (
              <a
                key={id}
                href={`/dashboard/projects/${projectSlug}/markets/${market.country_code}`}
                aria-label={`Open ${market.country_name} market intelligence`}
                className="focus:outline-none focus-visible:[&_path]:stroke-[3] focus-visible:[&_path]:stroke-primary"
              >
                <title>{market.country_name}</title>
                {shape}
              </a>
            ) : (
              <g key={id || `country-${index}`}>{shape}</g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
