import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, Star, XCircle, RotateCcw } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { getProjectService } from "@/features/projects/services/project-service";
import { listProjectTargetCountriesService } from "@/features/markets/services/market-service";
import { getCountry } from "@/config/countries";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
          <Link href={`/dashboard/projects/${projectSlug}/markets/compare`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4" /> Compare
            </Button>
          </Link>
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
    <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
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
      <div className="flex items-center gap-1 ml-2 shrink-0">
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
