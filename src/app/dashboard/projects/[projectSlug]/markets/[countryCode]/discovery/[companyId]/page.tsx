import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, Archive } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { getTargetCountryService } from "@/features/markets/services/market-service";
import { getCountry } from "@/config/countries";
import { listProjectCompanies } from "@/features/companies/repository/company-repository";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { ProjectCompanyStatus } from "@/features/companies/domain/company-lifecycle";
import { DecisionRoleSection } from "@/features/companies/components/decision-role-section";
import {
  getCompanyDecisionRoles,
  findLatestDecisionRoleRun,
  listDecisionRoleRuns,
} from "@/features/companies/repository/decision-role-repository";
import { OutreachSection } from "@/features/outreach/components/outreach-section";
import { getWorkspaceUsage } from "@/features/workspaces/services/workspace-usage-service";
import {
  getLatestProjectCompanyOutreachDraft,
  getLatestProjectCompanyOutreachRun,
  getOutreachRun,
} from "@/features/outreach/repository/outreach-repository";
import { resolveWorkspacePlan } from "@/features/workspaces/services/workspace-plan-service";

interface PageProps {
  params: Promise<{ projectSlug: string; countryCode: string; companyId: string }>;
}

export const metadata = { title: "Company Detail" };

const FIT_GRADE_TONE: Record<string, "success" | "accent" | "warning" | "danger"> = {
  strong: "success",
  medium: "accent",
  weak: "warning",
  disqualified: "danger",
};

export default async function CompanyDetailPage({ params }: PageProps) {
  const { projectSlug, countryCode, companyId } = await params;
  const ctx = await getAuthContext();
  const result = await getTargetCountryService(projectSlug, countryCode);
  if (!result) notFound();
  const { tc, project } = result;
  const wsId = ctx?.activeWorkspace?.workspace.id;
  const cat = getCountry(countryCode);

  if (!wsId) notFound();

  // Find the project company by company_id (the route param is the company_id)
  const { items: allPcs } = await listProjectCompanies(wsId, project.id, {
    targetCountryId: tc.id,
    pageSize: 500,
  });
  const pc = allPcs.find((c) => c.company_id === companyId);
  if (!pc) notFound();

  const decisionRoles = await getCompanyDecisionRoles(wsId, companyId);
  const activeDrRun = await findLatestDecisionRoleRun(wsId, companyId);
  const drRuns = await listDecisionRoleRuns(wsId, companyId);

  // Outreach usage
  const [planResolution, usage] = await Promise.all([
    resolveWorkspacePlan(wsId),
    getWorkspaceUsage(wsId),
  ]);
  const { plan } = planResolution;
  const outreachUsage = {
    used: usage.outreachGenerationsUsed,
    limit: plan.outreachGenerationsPerPeriod,
    remaining: Math.max(0, plan.outreachGenerationsPerPeriod - usage.outreachGenerationsUsed),
  };

  // Load latest draft for initial page load
  let initialDraft: Record<string, unknown> | null = null;
  const [latestDraft, latestOutreachRun] = await Promise.all([
    getLatestProjectCompanyOutreachDraft(wsId, project.id, companyId),
    getLatestProjectCompanyOutreachRun(wsId, project.id, companyId),
  ]);

  if (latestDraft) {
    const latestRun = await getOutreachRun(wsId, latestDraft.source_run_id);
    const view: Record<string, unknown> = {
      id: latestDraft.id,
      channel: latestDraft.channel,
      messageType: latestDraft.message_type,
      language: latestDraft.language,
      subject: latestDraft.subject,
      body: latestDraft.body,
      callToAction: latestDraft.call_to_action,
      tone: latestDraft.tone,
      length: latestDraft.length,
      status: latestDraft.status,
      confidence: null as number | null,
      personalizationSummary: null,
      evidenceUsed: [] as string[],
      assumptions: [] as string[],
      warnings: [] as string[],
      missingInformation: [] as string[],
    };

    if (latestRun?.result_snapshot && typeof latestRun.result_snapshot === "object") {
      const snap = latestRun.result_snapshot as Record<string, unknown>;
      if (typeof snap.confidence === "number") view.confidence = snap.confidence;
      if (snap.personalizationSummary && typeof snap.personalizationSummary === "object") {
        view.personalizationSummary = snap.personalizationSummary as Record<string, unknown>;
      }
      if (Array.isArray(snap.evidenceUsed)) view.evidenceUsed = snap.evidenceUsed as string[];
      if (Array.isArray(snap.assumptions)) view.assumptions = snap.assumptions as string[];
      if (Array.isArray(snap.warnings)) view.warnings = snap.warnings as string[];
      if (Array.isArray(snap.missingInformation))
        view.missingInformation = snap.missingInformation as string[];
    }

    initialDraft = view;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to discovery
      </Link>

      <PageHeader
        title={pc.company_name}
        description={pc.company_domain ? `Company detail · ${pc.company_domain}` : "Company detail"}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs">Industry</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-foreground">{pc.company_industry}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs">Country</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-foreground">
              {cat?.name ?? pc.company_country_code}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs">Employee Range</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-foreground tabular-nums">
              {pc.company_employee_min != null && pc.company_employee_max != null
                ? `${pc.company_employee_min}–${pc.company_employee_max}`
                : pc.company_employee_min != null
                  ? `${pc.company_employee_min}+`
                  : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fit Score Card */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Match Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "text-4xl font-bold tabular-nums",
                  pc.fit_score >= 70
                    ? "text-success"
                    : pc.fit_score >= 40
                      ? "text-accent"
                      : pc.fit_score > 0
                        ? "text-warning"
                        : "text-danger",
                )}
              >
                {pc.fit_score}
              </span>
              <Badge tone={FIT_GRADE_TONE[pc.fit_grade] ?? "neutral"}>{pc.fit_grade}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>
                Confidence:{" "}
                <span className="font-medium text-foreground">{pc.confidence_score}%</span>
              </p>
              {pc.provider_rank != null && (
                <p>
                  Provider rank:{" "}
                  <span className="font-medium text-foreground">#{pc.provider_rank}</span>
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Qualification reasons */}
      {pc.qualification_reasons.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success">
              Qualification Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {pc.qualification_reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-success" />
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Disqualification reasons */}
      {pc.disqualification_reasons.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-danger">
              Disqualification Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {pc.disqualification_reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-danger" />
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Matched signals */}
      {pc.matched_signals.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Matched Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {pc.matched_signals.map((s, i) => (
                <Badge key={i} tone="success" variant="outline">
                  {s.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing signals */}
      {pc.missing_signals.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missing Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {pc.missing_signals.map((s, i) => (
                <Badge key={i} tone="neutral" variant="outline">
                  {s.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lifecycle */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Lifecycle</CardTitle>
          <CardDescription>
            Current status: <span className="capitalize">{pc.status}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LifecycleButtons
            projectSlug={projectSlug}
            pcId={pc.id}
            status={pc.status as ProjectCompanyStatus}
          />
        </CardContent>
      </Card>

      <div className="pt-4">
        <DecisionRoleSection
          roles={decisionRoles}
          activeRun={activeDrRun}
          runs={drRuns}
          projectId={project.id}
          projectSlug={projectSlug}
          countryId={tc.id}
          companyId={companyId}
        />
      </div>

      <div className="pt-4">
        <OutreachSection
          roles={decisionRoles}
          projectSlug={projectSlug}
          countryCode={countryCode}
          countryId={tc.id}
          companyId={companyId}
          initialUsage={outreachUsage}
          initialDraft={initialDraft}
          initialRun={
            latestOutreachRun
              ? {
                  id: latestOutreachRun.id,
                  status: latestOutreachRun.status,
                  currentStage: latestOutreachRun.current_stage,
                  safeErrorMessage: latestOutreachRun.safe_error_message,
                }
              : null
          }
        />
      </div>
    </div>
  );
}

function LifecycleButtons({
  projectSlug,
  pcId,
  status,
}: {
  projectSlug: string;
  pcId: string;
  status: ProjectCompanyStatus;
}) {
  const actions = [
    {
      target: "shortlisted" as const,
      icon: CheckCircle,
      label: "Shortlist",
      show: status === "discovered",
    },
    {
      target: "approved" as const,
      icon: CheckCircle,
      label: "Approve",
      show: status === "shortlisted",
    },
    {
      target: "rejected" as const,
      icon: XCircle,
      label: "Reject",
      show: status === "discovered" || status === "shortlisted",
    },
    {
      target: "restore" as const,
      icon: RotateCcw,
      label: "Restore",
      show: status === "rejected" || status === "archived",
    },
    {
      target: "archived" as const,
      icon: Archive,
      label: "Archive",
      show: status === "discovered" || status === "shortlisted" || status === "approved",
    },
  ];

  const visible = actions.filter((a) => a.show);
  if (visible.length === 0)
    return <p className="text-sm text-muted-foreground">No actions available.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((action) => (
        <form
          key={action.target}
          action={async (fd: FormData) => {
            "use server";
            const m = await import("@/features/companies/api/company-actions");
            const targetStatus = action.target === "restore" ? "discovered" : action.target;
            fd.set("projectSlug", projectSlug);
            fd.set("pcId", pcId);
            fd.set("status", targetStatus);
            await m.changeCompanyLifecycleAction(fd);
          }}
        >
          <Button type="submit" variant="outline" size="sm">
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        </form>
      ))}
    </div>
  );
}
