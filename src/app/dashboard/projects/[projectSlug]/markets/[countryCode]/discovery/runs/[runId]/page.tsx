import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { getTargetCountryService } from "@/features/markets/services/market-service";
import { getCountry } from "@/config/countries";
import {
  getDiscoveryRun,
  listProjectCompanies,
} from "@/features/companies/repository/company-repository";
import { getIcpProfile } from "@/features/icp/repository/icp-repository";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
interface PageProps {
  params: Promise<{ projectSlug: string; countryCode: string; runId: string }>;
}

export const metadata = { title: "Discovery Run" };

export default async function DiscoveryRunDetailPage({ params }: PageProps) {
  const { projectSlug, countryCode, runId } = await params;
  const ctx = await getAuthContext();
  const result = await getTargetCountryService(projectSlug, countryCode);
  if (!result) notFound();
  const { tc, project } = result;
  const wsId = ctx?.activeWorkspace?.workspace.id;
  const cat = getCountry(countryCode);

  if (!wsId) notFound();

  const run = await getDiscoveryRun(wsId, runId);
  if (!run) notFound();

  const icpVersion = run.icp_profile_id
    ? await getIcpProfile(wsId, run.icp_profile_id).then((p) => p?.version ?? null)
    : null;

  const { items, total } = await listProjectCompanies(wsId, project.id, {
    targetCountryId: tc.id,
    discoveryRunId: runId,
    pageSize: 100,
    sort: "fit_score_desc",
  });

  const summary = run.result_summary as Record<string, unknown> | null;
  const inputSnapshot = run.input_snapshot as Record<string, unknown> | null;
  const criteriaSnapshot = run.criteria_snapshot as Record<string, unknown> | null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to discovery
      </Link>

      <PageHeader
        title="Discovery Run Details"
        description={`${cat?.name ?? tc.country_name} · ${new Date(run.created_at).toLocaleDateString()}`}
        actions={
          run.status === "failed" && (
            <form
              action={async (fd: FormData) => {
                "use server";
                const m = await import("@/features/companies/api/company-actions");
                await m.retryDiscoveryAction(fd);
              }}
            >
              <input type="hidden" name="projectSlug" value={projectSlug} />
              <input type="hidden" name="runId" value={run.id} />
              <Button type="submit">
                <RotateCcw className="h-4 w-4" /> Retry
              </Button>
            </form>
          )
        }
      />

      {/* Status + metadata */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs">Status</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusBadge status={run.status} />
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs">Provider</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-foreground">
              {run.provider} v{run.provider_version}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs">ICP Version</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-foreground tabular-nums">
              {icpVersion ? `v${icpVersion}` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs">Candidates Found</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-foreground tabular-nums">
              {summary?.totalCandidates != null ? (summary.totalCandidates as number) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timing */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs">Created</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{new Date(run.created_at).toLocaleString()}</p>
          </CardContent>
        </Card>
        {run.started_at && (
          <Card className="border-border/60">
            <CardHeader className="pb-1">
              <CardDescription className="text-xs">Started</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">{new Date(run.started_at).toLocaleString()}</p>
            </CardContent>
          </Card>
        )}
        {run.completed_at && (
          <Card className="border-border/60">
            <CardHeader className="pb-1">
              <CardDescription className="text-xs">Completed</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                {new Date(run.completed_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}
        {run.failed_at && (
          <Card className="border-border/60">
            <CardHeader className="pb-1">
              <CardDescription className="text-xs">Failed</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-danger">{new Date(run.failed_at).toLocaleString()}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Error display */}
      {run.status === "failed" && run.safe_error_message && (
        <Card className="border-danger/20 bg-danger/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-danger">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{run.safe_error_message}</p>
            {run.error_code && (
              <p className="mt-1 text-xs text-muted-foreground">Code: {run.error_code}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Input snapshot */}
      {inputSnapshot && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Input</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
              {JSON.stringify(inputSnapshot, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Criteria snapshot */}
      {criteriaSnapshot && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">ICP Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
              {JSON.stringify(criteriaSnapshot, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Result summary */}
      {summary && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Result Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
              {JSON.stringify(summary, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Companies found */}
      {items.length > 0 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Companies Found ({total})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery/${c.company_id}`}
                  className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/20"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.company_name}</p>
                    <p className="text-xs text-muted-foreground">{c.company_domain}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      tone={
                        c.fit_score >= 70 ? "success" : c.fit_score >= 40 ? "accent" : "warning"
                      }
                      className="tabular-nums"
                    >
                      {c.fit_score}
                    </Badge>
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
