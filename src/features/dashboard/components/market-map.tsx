"use client";

import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import { Minus, Plus } from "lucide-react";
import world from "world-atlas/countries-110m.json";
import { cn } from "@/lib/utils/cn";

const scores: Record<string, { country: string; score: number; x: number; y: number }> = {
  "840": { country: "United States", score: 94, x: 20, y: 29 },
  "124": { country: "Canada", score: 90, x: 39, y: 24 },
  "826": { country: "United Kingdom", score: 88, x: 50, y: 20 },
  "276": { country: "Germany", score: 92, x: 59, y: 24 },
  "392": { country: "Japan", score: 81, x: 90, y: 29 },
};

const topology = world as unknown as Topology<{ countries: GeometryCollection }>;

export function MarketMap({ demo = true }: { demo?: boolean }) {
  const [zoom, setZoom] = useState(1);
  const [active, setActive] = useState("Germany");
  const countries = useMemo(
    () => feature(topology, topology.objects.countries) as FeatureCollection<Geometry>,
    [],
  );
  const path = useMemo(() => {
    const projection = geoNaturalEarth1().fitExtent(
      [
        [14, 10],
        [806, 286],
      ],
      countries,
    );
    return geoPath(projection);
  }, [countries]);

  return (
    <div className="relative min-h-[468px] overflow-hidden bg-[#080c15]">
      <svg
        viewBox="0 0 820 300"
        className="absolute inset-x-0 top-[75%] w-full -translate-y-1/2 transition-transform duration-200"
        style={{ transform: `translateY(-50%) scale(${zoom * 1.4})` }}
        role="img"
        aria-label="Interactive world map showing market opportunity scores"
      >
        <defs>
          <filter id="countryGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {countries.features.map((country, index) => {
          const id = country.id === undefined ? undefined : String(country.id);
          const market = demo && id ? scores[id] : undefined;
          const selected = market?.country === active;
          const d = path(country);
          if (!d) return null;
          return (
            <path
              key={id ?? `country-${index}`}
              d={d}
              onMouseEnter={() => market && setActive(market.country)}
              fill={
                market ? (id === "276" ? "#b77931" : selected ? "#7650d5" : "#51368f") : "#252a39"
              }
              stroke={market ? "#a78bfa" : "#111522"}
              strokeWidth={market ? 0.8 : 0.45}
              filter={market && selected ? "url(#countryGlow)" : undefined}
              className={
                market
                  ? "cursor-pointer transition-colors duration-200 hover:fill-violet-500"
                  : undefined
              }
            />
          );
        })}
      </svg>

      {demo &&
        Object.values(scores).map((marker) => (
          <button
            key={marker.country}
            type="button"
            onMouseEnter={() => setActive(marker.country)}
            onFocus={() => setActive(marker.country)}
            onClick={() => setActive(marker.country)}
            className={cn(
              "absolute z-10 flex items-center gap-2 rounded-md border bg-[#0c1020] p-1.5 pr-3 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
              marker.country === "Japan" && "-translate-x-full",
              active === marker.country
                ? "z-20 -translate-y-0.5 border-violet-300/60 shadow-[0_0_24px_rgba(139,92,246,.45)]"
                : "border-violet-400/25 shadow-[0_0_14px_rgba(124,58,237,.18)]",
            )}
            style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            aria-pressed={active === marker.country}
          >
            <span className="grid h-7 min-w-7 place-items-center rounded bg-violet-600 text-[11px] font-bold text-white">
              {marker.score}
            </span>
            <span>
              <span className="block whitespace-nowrap text-[10px] font-semibold text-white">
                {marker.country}
              </span>
              <span className="block text-[10px] font-semibold text-emerald-400">
                {marker.score}
              </span>
            </span>
          </button>
        ))}

      {demo && (
        <div role="status" className="sr-only">
          {active} is selected
        </div>
      )}
      <div className="absolute bottom-14 left-3 z-20 grid gap-1">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom((value) => Math.min(1.18, value + 0.06))}
          className="grid h-9 w-9 place-items-center rounded-md border border-white/[.08] bg-[#121726] text-zinc-300 hover:border-violet-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom((value) => Math.max(0.94, value - 0.06))}
          className="grid h-9 w-9 place-items-center rounded-md border border-white/[.08] bg-[#121726] text-zinc-300 hover:border-violet-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </div>
      {demo && (
        <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-white/[.07] bg-[#080c16] px-4 py-2 text-[10px] text-zinc-400">
          <p className="mb-1 text-center text-zinc-300">Market Potential Score</p>
          <div className="flex whitespace-nowrap">
            {[
              ["#8b5cf6", "80-100"],
              ["#22c55e", "60-79"],
              ["#9ca3af", "40-59"],
              ["#f59e0b", "20-39"],
              ["#ef4444", "0-19"],
            ].map(([color, label]) => (
              <span key={label} className="mr-3 inline-flex items-center gap-1 last:mr-0">
                <i
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
