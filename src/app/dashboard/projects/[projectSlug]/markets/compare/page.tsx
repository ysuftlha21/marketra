import { ArrowLeft, BarChart3, Check, Scale, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCountry } from "@/config/countries";
import { getMarketAnalysisView } from "@/features/markets/domain/market-workspace-view";
import { listProjectTargetCountriesService } from "@/features/markets/services/market-service";
import { getProjectService } from "@/features/projects/services/project-service";
import { cn } from "@/lib/utils/cn";

interface PageProps {
  params: Promise<{ projectSlug: string }>;
  searchParams: Promise<{ market?: string | string[] }>;
}

export default async function ComparePage({ params, searchParams }: PageProps) {
  const [{ projectSlug }, query] = await Promise.all([params, searchParams]);
  const project = await getProjectService(projectSlug);
  if (!project) notFound();
  const markets = await listProjectTargetCountriesService(projectSlug);
  const analyzed = markets.filter((market) => market.has_completed_analysis);
  const requested = Array.isArray(query.market) ? query.market : query.market ? [query.market] : [];
  const selected = analyzed.filter((market) => requested.includes(market.country_code)).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-10">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      >
        <Link href="/dashboard/projects" className="hover:text-foreground">
          Projects
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/dashboard/projects/${projectSlug}`} className="hover:text-foreground">
          {project.name}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/dashboard/projects/${projectSlug}/markets`} className="hover:text-foreground">
          Markets
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="font-medium text-foreground">
          Compare
        </span>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge tone="primary">Decision workspace</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Market comparison
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Compare saved research for {project.name}. Only validated analysis output is shown.
          </p>
        </div>
        <Link
          href={`/dashboard/projects/${projectSlug}/markets`}
          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
        >
          <ArrowLeft aria-hidden="true" /> Back to markets
        </Link>
      </header>

      {analyzed.length < 2 ? (
        <EmptyState
          icon={BarChart3}
          title="More research is needed"
          description={`Complete market research for at least two countries before comparing them. ${analyzed.length} currently ready.`}
          action={
            <Link
              href={`/dashboard/projects/${projectSlug}/markets`}
              className={cn(buttonVariants())}
            >
              Review markets
            </Link>
          }
        />
      ) : (
        <>
          <Card className="p-5 shadow-none sm:p-6">
            <form method="get">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Choose markets</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Select between two and four research-ready markets.
                  </p>
                </div>
                <Button type="submit" className="mt-3 w-full sm:mt-0 sm:w-auto">
                  <Scale aria-hidden="true" /> Compare selected
                </Button>
              </div>
              <fieldset className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <legend className="sr-only">Markets to compare</legend>
                {analyzed.map((market) => {
                  const country = getCountry(market.country_code);
                  return (
                    <label
                      key={market.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-3 transition-colors duration-150 hover:border-primary/30 hover:bg-primary/5 focus-within:ring-2 focus-within:ring-ring"
                    >
                      <input
                        type="checkbox"
                        name="market"
                        value={market.country_code}
                        defaultChecked={requested.includes(market.country_code)}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <span className="text-lg" aria-hidden="true">
                        {country?.flagEmoji ?? market.country_code}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {country?.name ?? market.country_name}
                        </span>
                        <span className="block text-xs capitalize text-muted-foreground">
                          {market.latest_recommendation ?? "Research ready"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            </form>
          </Card>

          {selected.length < 2 ? (
            <EmptyState
              icon={Search}
              title="Select markets to compare"
              description="Choose at least two research-ready markets above. No comparison data is inferred before selection."
            />
          ) : (
            <section aria-labelledby="comparison-results-heading" className="space-y-4">
              <div>
                <h2
                  id="comparison-results-heading"
                  className="text-base font-semibold text-foreground"
                >
                  Side-by-side intelligence
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selected.length} markets compared using their latest completed research.
                </p>
              </div>
              <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                {selected.map((market) => (
                  <ComparisonColumn key={market.id} market={market} projectSlug={projectSlug} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ComparisonColumn({
  market,
  projectSlug,
}: {
  market: Awaited<ReturnType<typeof listProjectTargetCountriesService>>[number];
  projectSlug: string;
}) {
  const country = getCountry(market.country_code);
  const output = getMarketAnalysisView(market);
  const fields: Array<[string, string]> = output
    ? [
        ["Product opportunity", output.productCountryFit],
        ["Demand indicators", output.strongestFitSignals.join(" · ")],
        ["Competition / weak signals", output.weakestFitSignals.join(" · ")],
        ["Localization", output.localizationRequirements],
        ["Pricing expectations", output.pricingConsiderations],
        ["Operational complexity", output.operationalChallenges.join(" · ")],
        ["Suggested action", output.preferredEntryMotions.join(" · ")],
      ]
    : [];
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              {country?.flagEmoji ?? market.country_code}
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-foreground">
                {country?.name ?? market.country_name}
              </h3>
              <p className="text-xs capitalize text-muted-foreground">
                {country?.region.replaceAll("-", " ")}
              </p>
            </div>
          </div>
          <Badge
            tone={
              market.latest_recommendation === "pursue"
                ? "success"
                : market.latest_recommendation === "investigate"
                  ? "warning"
                  : "neutral"
            }
            className="capitalize"
          >
            {market.latest_recommendation ?? "Pending"}
          </Badge>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" /> Confidence:{" "}
          <span className="font-medium capitalize text-foreground">
            {market.latest_confidence ?? "Not assessed"}
          </span>
        </div>
      </div>
      <dl className="divide-y divide-border/70 px-5">
        {fields.map(([label, value]) => (
          <div key={label} className="py-4">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-foreground">{clean(value)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-auto border-t border-border p-4">
        <Link
          href={`/dashboard/projects/${projectSlug}/markets/${market.country_code}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
        >
          Open full intelligence
        </Link>
      </div>
    </Card>
  );
}

function clean(value: string) {
  return value.replace(/^\[mock\]\s*/, "") || "Not available in the latest research.";
}
