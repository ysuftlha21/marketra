"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import {
  dashboardKpis,
  marketOpportunities,
  nextSteps,
  recentActivity,
  sparklineSeries,
} from "../dashboard-demo-data";
import { MarketMap } from "./market-map";
import { OpportunitiesAreaChart, Sparkline } from "./dashboard-charts";
import { cn } from "@/lib/utils/cn";

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("marketra-panel", className)}>{children}</section>;
}

function Heading({
  number,
  title,
  extra,
}: {
  number: number;
  title: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex h-11 items-center gap-2 border-b border-white/[.055] px-3">
      <span className="marketra-number">{number}</span>
      <h2 className="text-[13px] font-semibold">{title}</h2>
      <div className="ml-auto">{extra}</div>
    </div>
  );
}

function Strategy() {
  return (
    <Panel className="min-h-[338px]">
      <Heading
        number={2}
        title="AI Strategy"
        extra={
          <span className="flex items-center gap-1 text-[9px] text-violet-400">
            <Sparkles className="h-3 w-3" /> AI
          </span>
        }
      />
      <div className="p-3.5">
        <p className="text-[10px] text-zinc-500">Top Recommendation</p>
        <div className="mt-2 flex items-center">
          <span className="mr-2 h-6 w-6 rounded-full bg-gradient-to-b from-zinc-900 via-red-500 to-amber-300" />
          <h3 className="text-[22px] font-semibold">Germany</h3>
          <span className="ml-auto grid h-12 w-12 place-items-center rounded-full border-[3px] border-violet-500 text-lg font-semibold shadow-[0_0_17px_#7c3aed]">
            92
          </span>
          <span className="ml-2 text-[8px] text-zinc-400">Match Score</span>
        </div>
        <div className="mt-3 grid grid-cols-4 border-y border-white/[.055] py-3">
          {[
            ["Est. ARR Potential", "$1.8M"],
            ["Market Size", "High"],
            ["Competition", "Low"],
            ["Ease of Entry", "High"],
          ].map(([a, b]) => (
            <div key={a} className="border-r border-white/[.05] px-2 first:pl-0 last:border-0">
              <p className="truncate text-[8px] text-zinc-500">{a}</p>
              <p className="mt-1 text-[12px] font-semibold">{b}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-zinc-300">Why Germany?</p>
        <ul className="mt-2 space-y-1.5">
          {[
            "Strong SaaS adoption and digital infrastructure",
            "High buying intent from target industries",
            "Low competition in your ideal customer segments",
          ].map((x) => (
            <li key={x} className="flex gap-2 text-[9px] text-zinc-400">
              <Check className="h-3 w-3 text-lime-400" />
              {x}
            </li>
          ))}
        </ul>
        <Link
          href="/dashboard/markets"
          className="mt-3 flex h-8 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-violet-700 via-violet-600 to-violet-700 text-[10px]"
        >
          Explore Germany <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Panel>
  );
}

function Steps() {
  return (
    <Panel>
      <Heading number={3} title="Your Next Steps" />
      <div className="px-3 py-1">
        {nextSteps.map(({ title, subtitle, action, icon: Icon }) => (
          <div
            key={title}
            className="flex items-center gap-2 rounded px-1 py-1 hover:bg-white/[.03]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#151a28]">
              <Icon className="h-3 w-3" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px]">{title}</p>
              <p className="truncate text-[8px] text-zinc-500">{subtitle}</p>
            </div>
            <Link
              href={
                title === "Company Discovery" || title === "Buyer Discovery"
                  ? "/dashboard/companies"
                  : title === "ICP Builder"
                    ? "/dashboard/projects"
                    : "/dashboard/outreach"
              }
              className="grid h-6 min-w-14 place-items-center rounded bg-white/[.04] text-[8px] hover:bg-violet-500/10"
            >
              {action}
            </Link>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function BottomPanels() {
  return (
    <div className="mt-3 grid gap-3 xl:grid-cols-[1.08fr_.77fr_1.48fr]">
      <Panel className="overflow-hidden">
        <Heading number={4} title="Top Market Opportunities" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[510px] text-left text-[9px]">
            <thead className="text-[8px] text-zinc-500">
              <tr>
                {[
                  "Country",
                  "Score",
                  "Market Size",
                  "Competition",
                  "Ease of Entry",
                  "Est. ARR",
                ].map((x) => (
                  <th key={x} className="px-2 py-2 font-normal">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {marketOpportunities.map((r) => (
                <tr
                  key={r.country}
                  className="border-t border-white/[.04] hover:bg-violet-500/[.04]"
                >
                  <td className="px-2 py-2">{r.country}</td>
                  <td>
                    <span className="rounded-full bg-violet-500/20 px-2 py-1 text-violet-300">
                      {r.score}
                    </span>
                  </td>
                  <td>{r.marketSize}</td>
                  <td className="text-emerald-400">
                    ● <span className="text-zinc-300">{r.competition}</span>
                  </td>
                  <td className="text-amber-400">
                    ● <span className="text-zinc-300">{r.ease}</span>
                  </td>
                  <td className="pr-2 text-right">{r.arr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel>
        <Heading
          number={5}
          title="Recent Activity"
          extra={<button className="text-[8px] text-violet-400">View All</button>}
        />
        <div className="px-3">
          {recentActivity.map(({ title, subtitle, time, icon: Icon }) => (
            <div
              key={title}
              className="flex items-center gap-2 border-b border-white/[.04] py-2 last:border-0"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#151a28]">
                <Icon className="h-3 w-3" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[9px]">{title}</p>
                <p className="truncate text-[8px] text-zinc-500">{subtitle}</p>
              </div>
              <time className="text-[8px] text-zinc-500">{time}</time>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <Heading
          number={6}
          title="Performance Overview"
          extra={
            <select
              aria-label="Performance period"
              className="h-6 rounded bg-[#111622] px-2 text-[8px]"
            >
              <option>Last 6 Months</option>
              <option>Last 3 Months</option>
            </select>
          }
        />
        <div className="grid grid-cols-3">
          {[
            ["Companies Matched", "2,458", "24%", sparklineSeries.companies, "#8b5cf6"],
            ["Decision Makers Found", "8,124", "32%", sparklineSeries.decisionMakers, "#3b82f6"],
            ["Response Rate", "24.6%", "8.1%", sparklineSeries.response, "#22c55e"],
          ].map(([a, b, c, d, e]) => (
            <div key={String(a)} className="border-r border-white/[.04] p-3 last:border-0">
              <p className="text-[8px] text-zinc-500">{String(a)}</p>
              <p className="text-[17px] font-semibold">
                {String(b)} <span className="text-[8px] text-emerald-400">↑ {String(c)}</span>
              </p>
              <Sparkline values={d as number[]} color={String(e)} className="h-7 w-full" />
            </div>
          ))}
        </div>
        <div className="mx-3 grid h-[114px] grid-cols-[105px_1fr] rounded border border-white/[.04] p-2">
          <div>
            <p className="text-[8px] text-zinc-400">Opportunities Over Time</p>
            <p className="text-[8px] text-zinc-600">Est. ARR Potential</p>
            <p className="mt-1 text-[17px] font-semibold">$1.8M</p>
            <p className="text-[9px] text-lime-400">↑ 18%</p>
          </div>
          <OpportunitiesAreaChart values={sparklineSeries.opportunities} />
        </div>
      </Panel>
    </div>
  );
}

export function DashboardOverview() {
  return (
    <div className="marketra-dashboard mx-auto w-full max-w-[1600px]">
      <h1 className="sr-only">Welcome to Marketra</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {dashboardKpis.map(({ title, value, subtitle, trend, icon: Icon, tone }) => (
          <article key={title} className="marketra-panel flex min-h-24 gap-3 p-3.5">
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg",
                tone === "cyan"
                  ? "bg-cyan-500/15 text-cyan-400"
                  : tone === "amber"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-violet-500/15 text-violet-400",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold">{title}</p>
              <p className="mt-1 text-[23px] font-semibold leading-none">{value}</p>
              <div className="mt-2 flex justify-between text-[10px]">
                <span className="text-zinc-500">{subtitle}</span>
                <span className="text-emerald-400">↑ {trend.replace("+ ", "")}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,2.37fr)_minmax(330px,1fr)]">
        <Panel className="min-h-[529px] overflow-hidden">
          <div className="flex h-12 items-center gap-2 px-3">
            <span className="marketra-number">1</span>
            <div>
              <h2 className="text-[13px] font-semibold">Select a Market</h2>
              <p className="text-[8px] text-zinc-500">
                Click a country to explore market potential and opportunities.
              </p>
            </div>
          </div>
          <MarketMap />
        </Panel>
        <div className="grid content-start gap-3">
          <Strategy />
          <Steps />
        </div>
      </div>
      <BottomPanels />
      <p className="py-3 text-center text-[9px] text-zinc-600">
        Marketra AI analyzes 150+ data sources to find your next market opportunity.
      </p>
    </div>
  );
}
