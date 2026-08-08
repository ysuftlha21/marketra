import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  FolderKanban,
  Globe2,
  LoaderCircle,
  Rocket,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { DashboardViewModel } from "../domain/dashboard-view-model";
import { MarketMap } from "./market-map";

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("marketra-panel", className)}>{children}</section>;
}

function Heading({ number, title, detail }: { number: number; title: string; detail?: string }) {
  return (
    <div className="flex min-h-12 items-center gap-2 border-b border-white/[.055] px-4 py-2">
      <span className="marketra-number" aria-hidden="true">
        {number}
      </span>
      <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
      {detail ? <span className="ml-auto text-xs text-zinc-500">{detail}</span> : null}
    </div>
  );
}

function Empty({
  icon: Icon,
  title,
  description,
  href,
  action,
  loading = false,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
  href?: string;
  action?: string;
  loading?: boolean;
}) {
  return (
    <div
      className="flex min-h-[200px] flex-col items-center justify-center px-6 py-8 text-center"
      role={loading ? "status" : undefined}
      aria-live={loading ? "polite" : undefined}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/20">
        <Icon
          className={cn("h-5 w-5", loading && "animate-spin motion-reduce:animate-none")}
          aria-hidden="true"
        />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-5 text-zinc-400">{description}</p>
      {href && action ? (
        <Link
          href={href}
          className="mt-5 inline-flex min-h-9 items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-xs font-medium text-white transition-colors duration-150 hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          {action}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

function DashboardIntro({ model }: { model: DashboardViewModel }) {
  const projectHref = model.project ? `/dashboard/projects/${model.project.slug}` : null;
  return (
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-violet-300">
          Workspace overview
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          Welcome to Marketra
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-zinc-400">
          {model.workspace ? `${model.workspace.name} workspace · ` : ""}
          Track your active project, target markets, discovery progress, and next recommended action.
        </p>
      </div>
      {model.project ? (
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-white/[.07] bg-[#0c101a] px-4 py-3 sm:max-w-sm">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-violet-500/10 text-violet-300">
            <FolderKanban className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-zinc-500">Active project</p>
            <p className="truncate text-sm font-medium text-zinc-100">{model.project.name}</p>
          </div>
          {projectHref ? (
            <Link
              href={projectHref}
              className="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              View
            </Link>
          ) : null}
        </div>
      ) : null}
    </header>
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
      model.metrics.matchedCompanies === null ? "Run an analysis first" : "Total found",
      Building2,
    ],
    [
      "Decision Makers",
      model.metrics.decisionMakers === null ? "—" : String(model.metrics.decisionMakers),
      model.metrics.decisionMakers === null ? "None discovered yet" : "Discovered",
      Users,
    ],
    [
      "AI Campaigns",
      String(model.metrics.activeCampaigns),
      model.metrics.activeCampaigns ? "Active campaigns" : "No active campaigns",
      Rocket,
    ],
    ["Opportunities", model.metrics.opportunityEstimate ?? "—", "No estimate yet", BarChart3],
  ] as const;

  return (
    <div className="marketra-dashboard mx-auto w-full max-w-[1600px]">
      <DashboardIntro model={model} />

      <section aria-label="Workspace metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map(([title, value, subtitle, Icon]) => (
          <article
            key={title}
            className="marketra-panel flex min-h-28 items-start gap-3 p-4 transition-colors duration-150 hover:border-white/[.12]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-300">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xs font-medium text-zinc-300">{title}</h2>
              <p className="mt-1.5 text-2xl font-semibold leading-none tabular-nums text-zinc-50">
                {value}
              </p>
              <p className="mt-2 text-[11px] leading-4 text-zinc-500">{subtitle}</p>
            </div>
          </article>
        ))}
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2.37fr)_minmax(330px,1fr)]">
        <Panel className="relative min-h-[529px] overflow-hidden">
          <Heading
            number={1}
            title="Select a Market"
            detail={`${model.targetMarkets.length} selected`}
          />
          <MarketMap demo={false} />
          <div className="absolute left-1/2 top-1/2 z-20 w-[min(380px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[.1] bg-[#0c101a] p-6 text-center shadow-lg">
            <Globe2 className="mx-auto h-6 w-6 text-violet-300" aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold text-zinc-50">
              {analyzing
                ? "Analyzing selected markets…"
                : model.targetMarkets.length
                  ? "Analysis not started"
                  : "Select your first market"}
            </h3>
            <p className="mt-2 text-xs leading-5 text-zinc-400">
              {analyzing
                ? "Final scores will appear when analysis completes."
                : model.targetMarkets.length
                  ? "Run an analysis to calculate market potential."
                  : "Choose one or more countries to begin market analysis."}
            </p>
            <Link
              href={marketsHref}
              className="mt-5 inline-flex min-h-9 items-center rounded-md bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              {analyzing
                ? "View Progress"
                : model.targetMarkets.length
                  ? "Run Analysis"
                  : "Select Markets"}
            </Link>
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <Panel className="min-h-[338px]">
            <Heading number={2} title="AI Strategy" />
            {analyzing ? (
              <Empty
                icon={LoaderCircle}
                title="Analyzing your selected markets…"
                description="Recommendations will appear after analysis completes."
                loading
              />
            ) : (
              <Empty
                icon={BarChart3}
                title="No recommendation yet"
                description="Complete your company profile and analyze at least one market to receive an AI strategy."
                href={marketsHref}
                action="Start Analysis"
              />
            )}
          </Panel>

          <Panel>
            <Heading number={3} title="Your Next Steps" />
            <div className="divide-y divide-white/[.04] p-3">
              {model.nextSteps.map((step) => (
                <div key={step.title} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-300">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-200">{step.title}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{step.description}</p>
                  </div>
                  <Link
                    href={step.href}
                    className="shrink-0 rounded-md border border-white/[.07] bg-white/[.03] px-3 py-2 text-[11px] font-medium text-zinc-200 hover:border-violet-400/30 hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    {step.action}
                  </Link>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.08fr_.77fr_1.48fr]">
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
            href="/dashboard/projects"
            action="View Projects"
          />
        </Panel>
        <Panel>
          <Heading number={6} title="Performance Overview" />
          <Empty
            icon={BarChart3}
            title="No performance data yet"
            description="Performance data will appear after you begin discovering companies and running campaigns."
            href="/dashboard/analytics"
            action="Open Analytics"
          />
        </Panel>
      </div>
    </div>
  );
}
