import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, Star, XCircle, RotateCcw, ArrowRight } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { getProjectService } from "@/features/projects/services/project-service";
import { listProjectTargetCountriesService } from "@/features/markets/services/market-service";
import { getCountry } from "@/config/countries";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { RunMarketAnalysisForm } from "@/features/markets/components/run-market-analysis-form";
import {
  removeTargetCountryAction,
  shortlistCountryAction,
  rejectCountryAction,
  restoreCountryAction,
} from "@/features/markets/api/market-actions";
import { AddTargetCountryForm } from "@/features/markets/components/add-target-country-form";
import type { TargetCountrySummary } from "@/features/markets/repository/market-repository";

interface PageProps {
  params: Promise<{ projectSlug: string }>;
}

export default async function MarketsPage({ params }: PageProps) {
  const { projectSlug } = await params;
  await getAuthContext();
  const project = await getProjectService(projectSlug);
  if (!project) notFound();
  const marketList = await listProjectTargetCountriesService(projectSlug);
  const analyzedCount = marketList.filter((market) => market.has_completed_analysis).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        href={`/dashboard/projects/${projectSlug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to project
      </Link>
      <PageHeader
        title="Target Markets"
        description={`${project.name} — select and analyze target countries.`}
        actions={
          analyzedCount >= 2 ? (
            <Link
              href={`/dashboard/projects/${projectSlug}/markets/compare`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <BarChart3 className="h-4 w-4" /> Compare
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Analyze at least two markets before comparing them."
            >
              <BarChart3 className="h-4 w-4" /> Compare · {analyzedCount}/2 analyzed
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Add target country</CardTitle>
        </CardHeader>
        <CardContent>
          <AddTargetCountryForm projectSlug={projectSlug} />
        </CardContent>
      </Card>

      {marketList.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No target countries yet"
          description="Add target countries above to begin market analysis."
        />
      ) : (
        <div className="space-y-3">
          {marketList.map((m) => (
            <CountryRow key={m.id} country={m} projectSlug={projectSlug} />
          ))}
        </div>
      )}
    </div>
  );
}

function CountryRow({
  country,
  projectSlug,
}: {
  country: TargetCountrySummary;
  projectSlug: string;
}) {
  const cat = getCountry(country.country_code);
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/dashboard/projects/${projectSlug}/markets/${country.country_code}`}
            className="truncate text-sm font-medium text-foreground hover:text-primary"
          >
            {cat?.name ?? country.country_name}{" "}
            <span className="text-xs text-muted-foreground">({country.country_code})</span>
          </Link>
          <StatusBadge status={country.status} />
          {country.latest_recommendation && (
            <span className="hidden sm:inline text-xs text-muted-foreground">
              <Star className="inline h-3 w-3" /> {country.latest_recommendation} (
              {country.latest_confidence ?? "?"})
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Analysis: {analysisStatusLabel(country.latest_analysis_status)}</span>
          {country.last_analyzed_at && (
            <span>· {new Date(country.last_analyzed_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-2 sm:justify-end">
        {!country.latest_analysis_status && (
          <RunMarketAnalysisForm projectSlug={projectSlug} countryId={country.id} />
        )}
        {(country.latest_analysis_status === "pending" ||
          country.latest_analysis_status === "running") && (
          <RunMarketAnalysisForm projectSlug={projectSlug} countryId={country.id} disabled />
        )}
        {country.latest_analysis_status === "failed" && (
          <RunMarketAnalysisForm projectSlug={projectSlug} countryId={country.id} mode="retry" />
        )}
        {country.latest_analysis_status === "failed" && country.has_completed_analysis && (
          <Link
            href={`/dashboard/projects/${projectSlug}/markets/${country.country_code}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View last analysis
          </Link>
        )}
        {country.latest_analysis_status === "succeeded" && (
          <Link
            href={`/dashboard/projects/${projectSlug}/markets/${country.country_code}`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            View analysis <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        {country.status === "analyzed" && (
          <form action={shortlistCountryAction}>
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="countryId" value={country.id} />
            <Button type="submit" variant="ghost" size="sm">
              <Star className="h-4 w-4 text-amber-500" />
            </Button>
          </form>
        )}
        {country.status === "analyzed" && (
          <form action={rejectCountryAction}>
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="countryId" value={country.id} />
            <Button type="submit" variant="ghost" size="sm">
              <XCircle className="h-4 w-4 text-danger" />
            </Button>
          </form>
        )}
        {(country.status === "shortlisted" || country.status === "rejected") && (
          <form action={restoreCountryAction}>
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="countryId" value={country.id} />
            <Button type="submit" variant="ghost" size="sm">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </form>
        )}
        {(country.status === "selected" || country.status === "analyzing") && (
          <form action={removeTargetCountryAction}>
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="countryId" value={country.id} />
            <Button type="submit" variant="ghost" size="sm">
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function analysisStatusLabel(status: TargetCountrySummary["latest_analysis_status"]): string {
  if (status === "succeeded") return "Analysis ready";
  if (status === "pending" || status === "running") return "Analyzing";
  if (status === "failed") return "Analysis failed";
  return "Not analyzed";
}
