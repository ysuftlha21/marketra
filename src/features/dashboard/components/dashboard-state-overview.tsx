import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Globe2,
  LoaderCircle,
  Rocket,
  Users,
} from "lucide-react";
import type { DashboardViewModel } from "../domain/dashboard-view-model";
import { MarketMap } from "./market-map";

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`marketra-panel ${className}`}>{children}</section>;
}
function Heading({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex h-11 items-center gap-2 border-b border-white/[.055] px-3">
      <span className="marketra-number">{number}</span>
      <h2 className="text-[13px] font-semibold">{title}</h2>
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  description,
  href,
  action,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-6 text-center">
      <Icon className="h-6 w-6 text-violet-400" />
      <p className="mt-3 text-[12px] font-semibold text-zinc-200">{title}</p>
      <p className="mt-1 max-w-sm text-[9px] leading-4 text-zinc-500">{description}</p>
      {href && action && (
        <Link
          href={href}
          className="mt-4 inline-flex h-8 items-center gap-2 rounded-md bg-violet-600 px-4 text-[9px] text-white hover:bg-violet-500"
        >
          {action}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export function DashboardStateOverview({ model }: { model: DashboardViewModel }) {
  const marketsHref = model.project
    ? `/dashboard/projects/${model.project.slug}/markets`
    : "/dashboard/projects/new";
  const analyzing = model.status === "analysis_in_progress";
  const kpis = [
    [
      "Target Markets",
      String(model.metrics.targetMarkets),
      model.metrics.targetMarkets ? "Active markets" : "No active markets",
      Globe2,
    ],
    [
      "Matched Companies",
      model.metrics.matchedCompanies === null ? "—" : String(model.metrics.matchedCompanies),
      model.metrics.matchedCompanies === null ? "Run a market analysis first" : "Total found",
      Building2,
    ],
    [
      "Decision Makers",
      model.metrics.decisionMakers === null ? "—" : String(model.metrics.decisionMakers),
      model.metrics.decisionMakers === null ? "No decision makers discovered" : "Discovered",
      Users,
    ],
    [
      "AI Campaigns",
      String(model.metrics.activeCampaigns),
      model.metrics.activeCampaigns ? "Active campaigns" : "No active campaigns",
      Rocket,
    ],
    [
      "Opportunities",
      model.metrics.opportunityEstimate ?? "—",
      "No opportunity estimate yet",
      BarChart3,
    ],
  ] as const;
  return (
    <div className="marketra-dashboard mx-auto w-full max-w-[1600px]">
      <h1 className="sr-only">Welcome to Marketra</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map(([title, value, subtitle, Icon]) => (
          <article key={title} className="marketra-panel flex min-h-24 gap-3 p-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 text-violet-400">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold">{title}</p>
              <p className="mt-1 text-[23px] font-semibold leading-none">{value}</p>
              <p className="mt-2 text-[9px] text-zinc-500">{subtitle}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,2.37fr)_minmax(330px,1fr)]">
        <Panel className="relative min-h-[529px] overflow-hidden">
          <Heading number={1} title="Select a Market" />
          <MarketMap demo={false} />
          <div className="absolute left-1/2 top-1/2 z-20 w-[min(360px,85%)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[.08] bg-[#0b0f19]/95 p-5 text-center">
            <Globe2 className="mx-auto h-6 w-6 text-violet-400" />
            <p className="mt-3 text-sm font-semibold">
              {analyzing
                ? "Analyzing selected markets…"
                : model.targetMarkets.length
                  ? "Analysis not started"
                  : "Select your first market"}
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              {analyzing
                ? "Final scores will appear when analysis completes."
                : model.targetMarkets.length
                  ? "Run an analysis to calculate market potential."
                  : "Choose one or more countries to begin market analysis."}
            </p>
            <Link
              href={marketsHref}
              className="mt-4 inline-flex rounded-md bg-violet-600 px-3 py-2 text-[9px]"
            >
              {analyzing
                ? "View Progress"
                : model.targetMarkets.length
                  ? "Run Analysis"
                  : "Select Markets"}
            </Link>
          </div>
        </Panel>
        <div className="grid content-start gap-3">
          <Panel className="min-h-[338px]">
            <Heading number={2} title="AI Strategy" />
            {analyzing ? (
              <Empty
                icon={LoaderCircle}
                title="Analyzing your selected markets…"
                description="Recommendations will appear after analysis completes."
              />
            ) : (
              <Empty
                icon={BarChart3}
                title="No recommendation yet."
                description="Complete your company profile and analyze at least one market to receive an AI strategy."
                href={marketsHref}
                action="Start Analysis"
              />
            )}
          </Panel>
          <Panel>
            <Heading number={3} title="Your Next Steps" />
            <div className="p-3">
              {model.nextSteps.map((step) => (
                <div key={step.title} className="flex items-center gap-2 py-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500/10 text-violet-400">
                    <ArrowRight className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px]">{step.title}</p>
                    <p className="truncate text-[8px] text-zinc-500">{step.description}</p>
                  </div>
                  <Link href={step.href} className="rounded bg-white/[.04] px-3 py-2 text-[8px]">
                    {step.action}
                  </Link>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[1.08fr_.77fr_1.48fr]">
        <Panel>
          <Heading number={4} title="Top Market Opportunities" />
          <Empty
            icon={Globe2}
            title="No completed market analysis"
            description="Analyze your selected markets to compare opportunities."
            href={marketsHref}
            action="Analyze Markets"
          />
        </Panel>
        <Panel>
          <Heading number={5} title="Recent Activity" />
          <Empty
            icon={Activity}
            title="No activity yet"
            description="Your analyses, discoveries, and campaigns will appear here."
          />
        </Panel>
        <Panel>
          <Heading number={6} title="Performance Overview" />
          <Empty
            icon={BarChart3}
            title="No performance data yet"
            description="Performance data will appear after you begin discovering companies and running campaigns."
          />
        </Panel>
      </div>
    </div>
  );
}
