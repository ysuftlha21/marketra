import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit3,
  Archive,
  Trash2,
  RotateCcw,
  Globe,
  BarChart3,
  Target,
  Users,
  DollarSign,
  ShoppingCart,
  HelpCircle,
} from "lucide-react";
import {
  getProjectService,
  getProjectAnalysisService,
} from "@/features/projects/services/project-service";
import { getAuthContext } from "@/lib/auth/session";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils/cn";
import { RunAnalysisButton } from "@/features/projects/components/run-analysis-button";
import { ProductAnalysisView } from "@/features/projects/components/product-analysis-view";
import { AnalysisStatusBadge } from "@/components/common/analysis-status-badge";
import { AnalysisProgressTracker } from "@/features/projects/components/analysis-progress-tracker";
import type { ProjectStatus } from "@/features/projects/domain/project-status";
import type { AnalysisRunStatus } from "@/features/projects/domain/analysis-status";
import { canRunAnalysis } from "@/features/projects/domain/project-status";
import { canRetry } from "@/features/projects/domain/analysis-status";
import { ProjectContextAndAnswersForm } from "@/features/projects/components/project-context-and-answers-form";
import { getClarificationAnswersService } from "@/features/projects/services/project-service";

interface PageProps {
  params: Promise<{ projectSlug: string }>;
}
export const metadata = { title: "Project" };

function InfoCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Globe;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { projectSlug } = await params;
  const ctx = await getAuthContext();
  const project = await getProjectService(projectSlug, true);
  if (!project) notFound();
  const {
    latest: latestRun,
    latestSuccessful,
    history,
  } = await getProjectAnalysisService(project.id, project.workspace_id, 10);
  const answers = await getClarificationAnswersService(project.id);
  const savedAnswersRecord: Record<string, string> = {};
  for (const a of answers) {
    savedAnswersRecord[a.question_key] = a.answer;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>

      <PageHeader
        title={project.name}
        description={
          project.product_description.slice(0, 200) +
          (project.product_description.length > 200 ? "…" : "")
        }
        actions={
          project.status !== "archived" && (
            <div className="flex flex-wrap gap-2">
              <RunAnalysisButton
                projectSlug={projectSlug}
                canRun={canRunAnalysis(project.status as ProjectStatus)}
                status={latestRun?.status}
                runId={latestRun?.id}
                isRetry={false}
              />
              <Link
                href={`/dashboard/projects/${projectSlug}/edit`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <Edit3 className="h-4 w-4" /> Edit
              </Link>
            </div>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard icon={Globe} label="Website">
          {project.website_url ? (
            <a
              href={project.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {new URL(project.website_url).hostname}
            </a>
          ) : (
            <span className="text-muted-foreground">Not provided</span>
          )}
        </InfoCard>
        <InfoCard icon={BarChart3} label="Status">
          <StatusBadge status={project.status as ProjectStatus} />
          {project.status === "archived" && project.archived_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              Archived {new Date(project.archived_at).toLocaleDateString()}
            </p>
          )}
        </InfoCard>
        <InfoCard icon={Target} label="Markets">
          {project.current_markets && project.current_markets.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {project.current_markets.map((m: string) => (
                <span
                  key={m}
                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {m}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">No markets specified</span>
          )}
        </InfoCard>
        {project.business_model && (
          <InfoCard icon={DollarSign} label="Business model">
            {project.business_model}
          </InfoCard>
        )}
        {project.target_customer_summary && (
          <InfoCard icon={Users} label="Target customer">
            {project.target_customer_summary}
          </InfoCard>
        )}
        {project.pricing_summary && (
          <InfoCard icon={ShoppingCart} label="Pricing">
            {project.pricing_summary}
          </InfoCard>
        )}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Product description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {project.product_description}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Latest product analysis</CardTitle>
          <CardDescription>
            {latestRun
              ? `Run ${new Date(latestRun.created_at).toLocaleDateString()}`
              : 'No analysis yet. Click "Run analysis" to start.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!latestRun ? (
            <EmptyState
              icon={BarChart3}
              title="No analysis yet"
              description="Run a product analysis to get AI-powered insights about your product."
            />
          ) : latestRun.status === "running" || latestRun.status === "pending" ? (
            <AnalysisProgressTracker
              runId={latestRun.id}
              initialStatus={latestRun.status}
              initialStage={latestRun.current_stage}
            />
          ) : latestRun.status === "failed" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-danger/20 bg-danger/5 p-4">
                <p className="text-sm font-semibold text-danger">Analysis failed</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {latestRun.safe_error_message ?? "An unexpected error occurred."}
                </p>
                {latestRun.error_code && (
                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Developer diagnostics
                    </summary>
                    <div className="mt-2 space-y-1 rounded bg-background p-2 font-mono text-muted-foreground border border-border/50">
                      <p>Code: {latestRun.error_code.split("|")[0]}</p>
                      <p>Stage: {latestRun.error_code.split("|")[1] || "unknown"}</p>
                    </div>
                  </details>
                )}
              </div>
              <RunAnalysisButton
                projectSlug={projectSlug}
                canRun={canRetry(latestRun.status as AnalysisRunStatus)}
                status={latestRun.status}
                runId={latestRun.id}
                isRetry
                previousRunId={latestRun.id}
              />
              {latestSuccessful?.output && latestSuccessful.id !== latestRun.id && (
                <div className="space-y-3 border-t border-border pt-4">
                  <p className="text-sm font-medium">Previous successful analysis</p>
                  <ProductAnalysisView
                    output={latestSuccessful.output as Record<string, unknown>}
                    meta={{
                      provider: latestSuccessful.provider,
                      promptVersion: latestSuccessful.prompt_version,
                      confidence:
                        ((latestSuccessful.output as Record<string, unknown>)
                          .confidence as string) || "medium",
                    }}
                  />
                </div>
              )}
            </div>
          ) : latestRun.output ? (
            <ProductAnalysisView
              output={latestRun.output as Record<string, unknown>}
              meta={{
                provider: latestRun.provider,
                promptVersion: latestRun.prompt_version,
                confidence:
                  ((latestRun.output as Record<string, unknown>).confidence as string) ||
                  (
                    (latestRun.output as Record<string, unknown>).sectionConfidences as Record<
                      string,
                      string
                    >
                  )?.market_analysis ||
                  "medium",
              }}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Analysis history</CardTitle>
          <CardDescription>
            {history.length > 0
              ? `${history.length} previous run${history.length > 1 ? "s" : ""}`
              : "No analysis runs yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Analysis results will appear here.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {history.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AnalysisStatusBadge status={run.status as AnalysisRunStatus} />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        {new Date(run.created_at).toLocaleDateString()}{" "}
                        <span className="text-xs text-muted-foreground">
                          {new Date(run.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground max-w-sm">
                        Version{" "}
                        {run.prompt_version === "v1"
                          ? "1"
                          : run.prompt_version === "product-analysis-v2"
                            ? "2"
                            : run.prompt_version}
                        {run.status === "failed" &&
                          run.safe_error_message &&
                          ` · ${run.safe_error_message}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {run.status === "failed" && (
                      <RunAnalysisButton
                        projectSlug={projectSlug}
                        canRun={canRetry(run.status as AnalysisRunStatus)}
                        isRetry
                        previousRunId={run.id}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {ctx?.activeWorkspace && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {project.status !== "archived" && (
                <form
                  action={async () => {
                    "use server";
                    const mod = await import("@/features/projects/api/project-actions");
                    await mod.archiveProjectAction(projectSlug);
                  }}
                >
                  <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
                    <Archive className="h-4 w-4" /> Archive
                  </button>
                </form>
              )}
              {project.status === "archived" && (
                <form
                  action={async () => {
                    "use server";
                    const mod = await import("@/features/projects/api/project-actions");
                    await mod.restoreProjectAction(projectSlug);
                  }}
                >
                  <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
                    <RotateCcw className="h-4 w-4" /> Restore
                  </button>
                </form>
              )}
              {project.status === "draft" && (
                <form
                  action={async () => {
                    "use server";
                    const mod = await import("@/features/projects/api/project-actions");
                    await mod.deleteDraftProjectAction(projectSlug);
                  }}
                >
                  <button type="submit" className={cn(buttonVariants({ variant: "destructive" }))}>
                    <Trash2 className="h-4 w-4" /> Delete draft
                  </button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <ProjectContextAndAnswersForm
        projectSlug={projectSlug}
        runId={latestRun?.id ?? null}
        initialAdditionalContext={project.additional_context as Record<string, unknown> | null}
        clarificationQuestions={
          latestRun?.output
            ? ((latestRun.output as Record<string, unknown>)
                .clarificationQuestions as import("@/lib/providers/ai/ai.provider").ClarificationQuestion[])
            : null
        }
        savedAnswers={savedAnswersRecord}
      />
      {latestRun?.output &&
        (() => {
          const output = latestRun.output as Record<string, unknown>;
          const missing = output.missingInformation as string[] | undefined;
          if (!missing?.length) return null;
          return (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  Missing information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {missing.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                      {item.replace(/^\[mock\]\s*/, "")}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })()}
    </div>
  );
}
