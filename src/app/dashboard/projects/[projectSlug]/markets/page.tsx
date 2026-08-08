import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Globe2,
  Plus,
  Search,
  Star,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddTargetCountryForm } from "@/features/markets/components/add-target-country-form";
import { MarketWorkspaceCard } from "@/features/markets/components/market-workspace-card";
import { MarketWorkspaceMap } from "@/features/markets/components/market-workspace-map";
import {
  filterAndSortMarkets,
  normalizeMarketFilters,
} from "@/features/markets/domain/market-workspace-view";
import { listProjectTargetCountriesService } from "@/features/markets/services/market-service";
import { getProjectService } from "@/features/projects/services/project-service";
import { getAuthContext } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";

interface PageProps {
  params: Promise<{ projectSlug: string }>;
  searchParams: Promise<{
    q?: string;
    region?: string;
    opportunity?: string;
    status?: string;
    favorite?: string;
    sort?: string;
  }>;
}

export default async function MarketsPage({ params, searchParams }: PageProps) {
  const [{ projectSlug }, query, context] = await Promise.all([
    params,
    searchParams,
    getAuthContext(),
  ]);
  const project = await getProjectService(projectSlug);
  if (!project) notFound();
  const marketList = await listProjectTargetCountriesService(projectSlug);
  const filters = normalizeMarketFilters(query);
  const filteredMarkets = filterAndSortMarkets(marketList, filters);
  const analyzedCount = marketList.filter((market) => market.has_completed_analysis).length;
  const shortlistedCount = marketList.filter((market) => market.status === "shortlisted").length;
  const inProgressCount = marketList.filter(
    (market) =>
      market.latest_analysis_status === "pending" || market.latest_analysis_status === "running",
  ).length;
  const lastUpdated = marketList
    .map((market) => market.last_analyzed_at ?? market.updated_at)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  const hasFilters = Object.entries(filters).some(([key, value]) =>
    key === "q" ? Boolean(value) : !["all", "recent"].includes(value),
  );
  const archived = project.status === "archived";

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-10">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      >
        <Link
          href="/dashboard/projects"
          className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Projects
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/dashboard/projects/${projectSlug}`}
          className="max-w-48 truncate rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {project.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-foreground" aria-current="page">
          Markets
        </span>
      </nav>

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="primary">Market intelligence</Badge>
            {context?.activeWorkspace?.workspace.name && (
              <span className="text-xs text-muted-foreground">
                {context.activeWorkspace.workspace.name}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Markets
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Decide which countries are worth expanding into for {project.name}, using comparable
            research and explicit evidence.
          </p>
          <Link
            href="/dashboard/projects"
            className="mt-3 inline-flex items-center gap-1.5 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to Projects
          </Link>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {analyzedCount >= 2 ? (
            <Link
              href={`/dashboard/projects/${projectSlug}/markets/compare`}
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              <BarChart3 aria-hidden="true" /> Compare markets
            </Link>
          ) : (
            <Button
              variant="outline"
              disabled
              title="Analyze at least two markets before comparing them."
              className="w-full sm:w-auto"
            >
              <BarChart3 aria-hidden="true" /> Compare · {analyzedCount}/2 ready
            </Button>
          )}
          {!archived && (
            <a href="#add-market" className={cn(buttonVariants(), "w-full sm:w-auto")}>
              <Plus aria-hidden="true" /> Add market
            </a>
          )}
        </div>
      </header>

      <section aria-labelledby="market-summary-heading">
        <h2 id="market-summary-heading" className="sr-only">
          Market workspace summary
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard icon={Globe2} label="Target markets" value={marketList.length} />
          <SummaryCard icon={CheckCircle2} label="Research ready" value={analyzedCount} />
          <SummaryCard icon={Star} label="Favorites" value={shortlistedCount} />
          <SummaryCard
            icon={Clock3}
            label="In progress"
            value={inProgressCount}
            detail={lastUpdated ? `Updated ${formatDate(lastUpdated)}` : "No research yet"}
          />
        </div>
      </section>

      {marketList.length > 0 && (
        <MarketWorkspaceMap markets={marketList} projectSlug={projectSlug} />
      )}

      {archived ? (
        <EmptyState
          icon={Globe2}
          title="This project is archived"
          description="Market intelligence remains available for review. Restore the project before adding or changing markets."
          action={
            <Link
              href={`/dashboard/projects/${projectSlug}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Review project
            </Link>
          }
        />
      ) : (
        <Card id="add-market" className="scroll-mt-6 p-5 shadow-none sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Add a target market</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Choose a country to create its project-scoped research workspace.
              </p>
            </div>
            <AddTargetCountryForm projectSlug={projectSlug} />
          </div>
        </Card>
      )}

      {marketList.length > 0 && (
        <section
          className="rounded-xl border border-border bg-surface p-3 shadow-sm"
          aria-label="Market filters"
        >
          <form
            method="get"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(5,minmax(130px,auto))]"
          >
            <label className="relative min-w-0">
              <span className="sr-only">Search markets</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                name="q"
                type="search"
                defaultValue={filters.q}
                placeholder="Search country, region, currency…"
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </label>
            <FilterSelect
              name="region"
              label="Region"
              value={filters.region}
              options={[
                ["all", "All regions"],
                ["europe", "Europe"],
                ["north-america", "North America"],
                ["asia-pacific", "Asia Pacific"],
                ["latin-america", "Latin America"],
                ["middle-east-africa", "Middle East & Africa"],
              ]}
            />
            <FilterSelect
              name="opportunity"
              label="Opportunity"
              value={filters.opportunity}
              options={[
                ["all", "All opportunity"],
                ["pursue", "Pursue"],
                ["investigate", "Investigate"],
                ["deprioritize", "Deprioritize"],
                ["pending", "Pending research"],
              ]}
            />
            <FilterSelect
              name="status"
              label="Status"
              value={filters.status}
              options={[
                ["all", "All status"],
                ["selected", "Selected"],
                ["analyzing", "Analyzing"],
                ["analyzed", "Analyzed"],
                ["shortlisted", "Favorites"],
                ["rejected", "Deprioritized"],
              ]}
            />
            <FilterSelect
              name="favorite"
              label="Favorites"
              value={filters.favorite}
              options={[
                ["all", "All markets"],
                ["favorites", "Favorites only"],
              ]}
            />
            <FilterSelect
              name="sort"
              label="Sort markets"
              value={filters.sort}
              options={[
                ["recent", "Recently updated"],
                ["alphabetical", "Alphabetical"],
                ["country-added", "Recently added"],
              ]}
            />
            <div className="flex gap-2 md:col-span-2 xl:col-span-1">
              <Button type="submit" variant="secondary" className="flex-1 xl:px-3">
                <Filter aria-hidden="true" /> Apply
              </Button>
              {hasFilters && (
                <Link
                  href={`/dashboard/projects/${projectSlug}/markets`}
                  className={cn(buttonVariants({ variant: "ghost" }), "px-3")}
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </section>
      )}

      {marketList.length === 0 && !archived ? (
        <EmptyState
          icon={Globe2}
          title="Choose your first expansion market"
          description="Add a country above to compare market conditions, run evidence-based research, and continue into ICP and company discovery."
          action={
            <a href="#add-market" className={cn(buttonVariants())}>
              <Plus aria-hidden="true" /> Add first market
            </a>
          }
        />
      ) : filteredMarkets.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No markets match these filters"
          description="Clear or adjust the filters to return to your target market workspaces."
          action={
            <Link
              href={`/dashboard/projects/${projectSlug}/markets`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Clear filters
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="market-grid-heading" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="market-grid-heading" className="text-base font-semibold text-foreground">
                Market workspaces
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {filteredMarkets.length} of {marketList.length} markets shown
              </p>
            </div>
          </div>
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            {filteredMarkets.map((market) => (
              <MarketWorkspaceCard key={market.id} market={market} projectSlug={projectSlug} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Globe2;
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <Card className="flex min-w-0 items-center gap-3 p-4 shadow-none sm:p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        {detail && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{detail}</p>}
      </div>
    </Card>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="relative min-w-0">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </label>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
