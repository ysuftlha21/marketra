import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";
import { resolveAuthenticatedProjectContext } from "@/features/projects/services/project-context-service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProjectAnalyticsCounts } from "@/features/analytics/repository/analytics-repository";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const context = await resolveAuthenticatedProjectContext();
  const counts =
    context.workspaceId && context.project
      ? await getProjectAnalyticsCounts(context.workspaceId, context.project.id)
      : null;
  const metrics = [
    ["Target markets", context.markets.length],
    ["Analyzed markets", context.markets.filter((market) => market.has_completed_analysis).length],
    ["Saved companies", counts?.savedCompanies ?? 0],
    ["Buyer roles", counts?.buyers ?? 0],
    ["Outreach drafts", counts?.outreachDrafts ?? 0],
    ["Campaign-ready drafts", counts?.approvedOutreachDrafts ?? 0],
    ["AI usage events", counts?.aiUsageEvents ?? 0],
    ["Hunter discovery runs", counts?.hunterDiscoveryRuns ?? 0],
  ] as const;
  const hasActivity = metrics.some(([, value]) => value > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="Project performance"
        description={
          context.project
            ? `Stored activity for ${context.project.name}. No demo data is included.`
            : "Activity for the active project."
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Project metrics">
        {metrics.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {!hasActivity && (
        <EmptyState
          icon={ChartNoAxesCombined}
          title={context.project ? "No activity yet" : "Create a project first"}
          description={
            context.project
              ? "Metrics will update from real market, discovery, buyer and outreach records."
              : "Analytics is scoped to an authenticated active project."
          }
          action={
            <Link
              href={context.project ? "/dashboard/markets" : "/dashboard/projects/new"}
              className={buttonVariants()}
            >
              {context.project ? "Add a target market" : "Create project"}
            </Link>
          }
        />
      )}
    </div>
  );
}
