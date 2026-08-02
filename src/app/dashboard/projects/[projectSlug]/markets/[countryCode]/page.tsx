import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RotateCcw,
  BarChart3,
  Star,
  XCircle,
  CheckCircle,
  AlertTriangle,
  MapPin,
  CreditCard,
  Languages,
  Target,
  Users,
} from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { getTargetCountryService } from "@/features/markets/services/market-service";
import {
  getLatestMarketAnalysisRun,
  getLatestSuccessfulMarketAnalysisRun,
  listMarketAnalysisRuns,
} from "@/features/markets/repository/market-repository";
import { getCountry } from "@/config/countries";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import {
  shortlistCountryAction,
  rejectCountryAction,
  restoreCountryAction,
  updateTargetCountryAction,
  retryMarketAnalysisAction,
} from "@/features/markets/api/market-actions";
import { RunMarketAnalysisForm } from "@/features/markets/components/run-market-analysis-form";
import {
  canStartAnalysis,
  canShortlist,
  canReject,
  canRestore,
} from "@/features/markets/domain/target-country-status";
import {
  countryMarketAnalysisResultSchema,
  type CountryMarketAnalysisResult,
} from "@/features/markets/schema/market-analysis-schemas";

interface PageProps {
  params: Promise<{ projectSlug: string; countryCode: string }>;
}

export default async function MarketCountryPage({ params }: PageProps) {
  const { projectSlug, countryCode } = await params;
  const ctx = await getAuthContext();
  const result = await getTargetCountryService(projectSlug, countryCode);
  if (!result) notFound();
  const { tc, project } = result;
  const wsId = ctx?.activeWorkspace?.workspace.id;
  const latestRun = wsId ? await getLatestMarketAnalysisRun(wsId, tc.id) : null;
  const latestCompletedRun = wsId ? await getLatestSuccessfulMarketAnalysisRun(wsId, tc.id) : null;
  const history = wsId ? await listMarketAnalysisRuns(wsId, tc.id, 10) : [];
  const cat = getCountry(countryCode);
  const status = tc.status as Parameters<typeof canStartAnalysis>[0];
  const displayRun = latestCompletedRun ?? (latestRun?.status === "succeeded" ? latestRun : null);
  const parsedOutput = countryMarketAnalysisResultSchema.safeParse(displayRun?.output);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/dashboard/projects/${projectSlug}/markets`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to markets
      </Link>

      <PageHeader
        title={cat?.name ?? tc.country_name}
        description={`Market analysis for ${project.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {latestRun?.status === "failed" ? (
              <RunMarketAnalysisForm projectSlug={projectSlug} countryId={tc.id} mode="retry" />
            ) : latestRun?.status === "pending" || latestRun?.status === "running" ? (
              <RunMarketAnalysisForm projectSlug={projectSlug} countryId={tc.id} disabled />
            ) : (
              <RunMarketAnalysisForm
                projectSlug={projectSlug}
                countryId={tc.id}
                disabled={!canStartAnalysis(status)}
              />
            )}
            {canShortlist(status) && (
              <form action={shortlistCountryAction}>
                <input type="hidden" name="projectSlug" value={projectSlug} />
                <input type="hidden" name="countryId" value={tc.id} />
                <Button type="submit" variant="outline" size="sm">
                  <Star className="h-4 w-4" /> Shortlist
                </Button>
              </form>
            )}
            {canReject(status) && (
              <form action={rejectCountryAction}>
                <input type="hidden" name="projectSlug" value={projectSlug} />
                <input type="hidden" name="countryId" value={tc.id} />
                <Button type="submit" variant="outline" size="sm">
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              </form>
            )}
            {canRestore(status) && (
              <form action={restoreCountryAction}>
                <input type="hidden" name="projectSlug" value={projectSlug} />
                <input type="hidden" name="countryId" value={tc.id} />
                <Button type="submit" variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4" /> Restore
                </Button>
              </form>
            )}
          </div>
        }
      />

      <StatusBadge status={tc.status} />

      {/* Country overview */}
      {cat && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Country overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Region</p>
                <p className="font-medium text-foreground capitalize">
                  {cat.region.split("-").join(" ")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="font-medium text-foreground">{cat.currency}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                <Languages className="h-4 w-4 text-muted-foreground" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Language</p>
                <p className="font-medium text-foreground">{cat.primaryLanguage}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTargetCountryAction} className="space-y-3">
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="countryId" value={tc.id} />
            <Textarea
              name="notes"
              defaultValue={tc.notes ?? ""}
              rows={3}
              placeholder="Add internal notes about this market…"
            />
            <Button type="submit" variant="outline" size="sm">
              Save notes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Latest analysis */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Latest market analysis</CardTitle>
          <CardDescription>
            {latestRun
              ? `Run ${new Date(latestRun.created_at).toLocaleDateString()}`
              : "No analysis yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!latestRun ? (
            <EmptyState
              icon={BarChart3}
              title="No analysis yet"
              description="Run a market analysis for this country."
            />
          ) : latestRun.status === "running" || latestRun.status === "pending" ? (
            <div className="flex items-center gap-3 py-8">
              <RotateCcw className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Analysis running…</p>
            </div>
          ) : latestRun.status === "failed" && !latestCompletedRun ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-danger/20 bg-danger/5 p-4">
                <p className="text-sm font-semibold text-danger">Analysis failed</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {latestRun.safe_error_message ?? "An error occurred."}
                </p>
              </div>
              <form action={retryMarketAnalysisAction}>
                <input type="hidden" name="projectSlug" value={projectSlug} />
                <input type="hidden" name="previousRunId" value={latestRun.id} />
                <Button type="submit" variant="outline">
                  <RotateCcw className="h-4 w-4" /> Retry
                </Button>
              </form>
            </div>
          ) : parsedOutput.success ? (
            <AnalysisDisplay output={parsedOutput.data} />
          ) : displayRun ? (
            <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
              <p className="text-sm font-semibold text-warning">Analysis output unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This saved analysis cannot be displayed safely. Retry the analysis to refresh it.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Analysis history */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Analysis history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {history.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={run.status} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(run.created_at).toLocaleDateString()} — {run.provider}
                    </span>
                  </div>
                  {run.status === "failed" && (
                    <form action={retryMarketAnalysisAction}>
                      <input type="hidden" name="projectSlug" value={projectSlug} />
                      <input type="hidden" name="previousRunId" value={run.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        <RotateCcw className="h-3 w-3" /> Retry
                      </Button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next steps */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/dashboard/projects/${projectSlug}/markets/${countryCode}/icp`}
          className="group rounded-lg border border-border bg-surface p-5 transition-colors hover:border-primary/30 hover:bg-primary/5"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary">ICP</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Define the Ideal Customer Profile for this market — industries, company attributes,
                buyer roles, and signals.
              </p>
            </div>
          </div>
        </Link>
        <Link
          href={`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery`}
          className="group rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent/30 hover:bg-accent/5"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-accent">
                Company Discovery
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Discover and score companies matching your ICP — review fit, shortlist candidates,
                and track outreach.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function AnalysisDisplay({ output }: { output: CountryMarketAnalysisResult }) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
        <h3 className="mb-1.5 text-sm font-semibold">Executive summary</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {output.executiveSummary.replace(/^\[mock\]\s*/, "")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ListSection title="Strengths" items={output.strongestFitSignals} color="success" />
        <ListSection
          title="Weak signals"
          items={output.weakestFitSignals}
          color="muted-foreground"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-surface p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Customer segments
          </h3>
          <ul className="space-y-1.5">
            {output.relevantCustomerSegments.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                {s.replace(/^\[mock\]\s*/, "")}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border/60 bg-surface p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Buyer roles
          </h3>
          <ul className="space-y-1.5">
            {output.likelyBuyerRoles.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-accent/40" />
                {r.replace(/^\[mock\]\s*/, "")}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Entry motions
          </h3>
          <ul className="space-y-1">
            {output.preferredEntryMotions.map((m, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {m.replace(/^\[mock\]\s*/, "")}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Channels
          </h3>
          <ul className="space-y-1">
            {output.likelyAcquisitionChannels.map((c, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {c.replace(/^\[mock\]\s*/, "")}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Localization
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {output.localizationRequirements.replace(/^\[mock\]\s*/, "")}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sales cycle
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {output.salesCycleExpectations.replace(/^\[mock\]\s*/, "")}
          </p>
        </div>
      </div>

      <ListSection title="Adoption barriers" items={output.adoptionBarriers} color="danger" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Regulatory
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {output.regulatoryConsiderations.replace(/^\[mock\]\s*/, "")}
          </p>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Data protection
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {output.dataProtectionConsiderations.replace(/^\[mock\]\s*/, "")}
          </p>
        </div>
      </div>

      {output.validationExperiments.length > 0 && (
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
            Validation experiments
          </h3>
          <ul className="space-y-1.5">
            {output.validationExperiments.map((v, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {v.replace(/^\[mock\]\s*/, "")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ListSection
        title="Unresolved questions"
        items={output.unresolvedQuestions}
        color="muted-foreground"
      />
      <ListSection
        title="Evidence limitations"
        items={output.evidenceLimitations}
        color="warning"
      />

      <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={
              output.entryRecommendation === "pursue"
                ? "flex h-3 w-3 rounded-full bg-success"
                : output.entryRecommendation === "investigate"
                  ? "flex h-3 w-3 rounded-full bg-accent"
                  : "flex h-3 w-3 rounded-full bg-muted-foreground"
            }
          />
          <span className="text-sm font-semibold capitalize">{output.entryRecommendation}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Confidence:{" "}
          <span className="font-medium text-foreground capitalize">{output.confidence}</span>
        </span>
      </div>
    </div>
  );
}

function ListSection({ title, items, color }: { title: string; items: string[]; color?: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            {color === "success" ? (
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : color === "danger" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            ) : (
              <span
                className={cn(
                  "mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full",
                  color === "warning" ? "bg-warning" : "bg-muted-foreground/30",
                )}
              />
            )}
            {item.replace(/^\[mock\]\s*/, "")}
          </li>
        ))}
      </ul>
    </div>
  );
}
