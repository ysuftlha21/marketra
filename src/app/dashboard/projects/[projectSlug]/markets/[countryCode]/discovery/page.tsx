import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  XCircle,
  Archive,
  RefreshCw,
  MessageSquare,
  Users,
  ChevronRight,
  Info,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { getTargetCountryService } from "@/features/markets/services/market-service";
import { getCountry } from "@/config/countries";
import {
  listDiscoveryRuns,
  listProjectCompanies,
  countProjectCompaniesByStatus,
  listCompanyDiscoveryFilters,
} from "@/features/companies/repository/company-repository";
import { getIcpProfile } from "@/features/icp/repository/icp-repository";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { DiscoveryRunStatus } from "@/features/companies/domain/discovery-run-status";
import type { ProjectCompanyStatus } from "@/features/companies/domain/company-lifecycle";
import { ManualCompanyForm } from "@/features/companies/components/manual-company-form";
import { providerProvenanceLabel } from "@/features/companies/domain/data-provenance";
import { parseServerEnv } from "@/lib/env/env";
import { getHunterReadiness } from "@/lib/providers/hunter/hunter-readiness";
import { getProjectIcpReadiness } from "@/features/icp/services/icp-readiness-service";
import { DiscoverySubmitButton } from "@/features/companies/components/discovery-submit-button";
import { AdaptCountryIcpForm } from "@/features/icp/components/adapt-country-icp-form";
import { DiscoveryFiltersForm } from "@/features/companies/components/discovery-filters-form";

interface PageProps {
  params: Promise<{ projectSlug: string; countryCode: string }>;
  searchParams: Promise<{
    status?: string;
    sort?: string;
    page?: string;
    minScore?: string;
  }>;
}

export const metadata = { title: "Company Discovery" };

const FIT_GRADE_TONE: Record<string, "success" | "accent" | "warning" | "danger"> = {
  strong: "success",
  medium: "accent",
  weak: "warning",
  disqualified: "danger",
};

function FitScoreBadge({ score, grade }: { score: number; grade: string }) {
  const tone = FIT_GRADE_TONE[grade] ?? "neutral";
  return (
    <Badge tone={tone} className="tabular-nums">
      {score}
    </Badge>
  );
}

async function getIcpVersion(icpProfileId: string | null, wsId: string): Promise<number | null> {
  if (!icpProfileId) return null;
  const icp = await getIcpProfile(wsId, icpProfileId);
  return icp?.version ?? null;
}

export default async function DiscoveryPage({ params, searchParams }: PageProps) {
  const { projectSlug, countryCode } = await params;
  const sp = await searchParams;
  const ctx = await getAuthContext();
  const result = await getTargetCountryService(projectSlug, countryCode);
  if (!result) notFound();
  const { tc, project } = result;
  const wsId = ctx?.activeWorkspace?.workspace.id;

  const emptyCounts: Record<string, number> = {};
  const [runs, _filters, statusCounts] = wsId
    ? await Promise.all([
        listDiscoveryRuns(wsId, project.id),
        listCompanyDiscoveryFilters(wsId, project.id),
        countProjectCompaniesByStatus(wsId, project.id, tc.id),
      ])
    : [[], { industries: [], countries: [] }, emptyCounts];

  const latestRun = runs[0] ?? null;
  const cat = getCountry(countryCode);
  const env = parseServerEnv();
  const providerLabel = providerProvenanceLabel(env.DEFAULT_COMPANY_DISCOVERY_PROVIDER);
  const hunterReadiness = getHunterReadiness();
  const discoveryEnabled =
    env.DEFAULT_COMPANY_DISCOVERY_PROVIDER !== "hunter" || env.HUNTER_DISCOVERY_UI_ENABLED;
  const icpReadiness = await getProjectIcpReadiness(projectSlug, countryCode);
  const approvedIcp = icpReadiness.state === "ready" ? icpReadiness.profile : null;
  const primaryIndustries = Array.isArray(approvedIcp?.industry_segments.primary)
    ? approvedIcp.industry_segments.primary
    : [];
  const defaultIndustry = primaryIndustries
    .map((item) =>
      typeof item === "string"
        ? item
        : item && typeof item === "object" && "name" in item
          ? String(item.name)
          : "",
    )
    .find(Boolean);
  const employeeRange = String(approvedIcp?.company_attributes.employeeRange ?? "");
  const employeeMatches = employeeRange.match(/(\d[\d,]*)\D+(\d[\d,]*)/);
  const defaultEmployeeMin = employeeMatches?.[1]?.replaceAll(",", "") ?? "";
  const defaultEmployeeMax = employeeMatches?.[2]?.replaceAll(",", "") ?? "";
  const defaultKeywords = approvedIcp?.qualification_signals.slice(0, 6).join(", ") ?? "";
  const defaultTechnologies =
    approvedIcp?.technology_context && typeof approvedIcp.technology_context.summary === "string"
      ? approvedIcp.technology_context.summary
      : "";

  // URL-driven filters
  const filterStatus = sp.status || "";
  const filterSort = sp.sort || "fit_score_desc";
  const filterPage = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const filterMinScore = sp.minScore ? parseInt(sp.minScore, 10) : undefined;
  const pageSize = 15;

  function href(fields: Record<string, string | undefined>): string {
    const base = `/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery`;
    const params = new URLSearchParams();
    const s = fields.status ?? filterStatus;
    const sort = fields.sort ?? filterSort;
    const p = fields.page ?? String(filterPage);
    const ms = fields.minScore !== undefined ? fields.minScore : filterMinScore?.toString();
    if (s) params.set("status", s);
    if (sort && sort !== "fit_score_desc") params.set("sort", sort);
    if (p && p !== "1") params.set("page", p);
    if (ms) params.set("minScore", ms);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href={`/dashboard/projects/${projectSlug}/markets/${countryCode}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to market
      </Link>

      <PageHeader
        title={`${cat?.name ?? tc.country_name} · Company Discovery`}
        description={`Discover and evaluate companies matching the ICP for ${project.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {approvedIcp &&
            discoveryEnabled &&
            latestRun &&
            isActiveStatus(latestRun.status as DiscoveryRunStatus) ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Running…
              </span>
            ) : approvedIcp && discoveryEnabled ? (
              <form
                action={async (fd: FormData) => {
                  "use server";
                  const m = await import("@/features/companies/api/company-actions");
                  await m.startDiscoveryAction(fd);
                }}
              >
                <input type="hidden" name="projectSlug" value={projectSlug} />
                <input type="hidden" name="countryId" value={tc.id} />
                <DiscoverySubmitButton label="Start Discovery" />
              </form>
            ) : null}
          </div>
        }
      />

      {icpReadiness.state === "missing" && (
        <EmptyState
          icon={Users}
          title="Create ICP"
          description="A country-specific ICP is required so discovery can score and explain matches safely."
          action={
            <Link
              href={`/dashboard/projects/${projectSlug}/markets/${countryCode}/icp`}
              className={buttonVariants()}
            >
              Create ICP
            </Link>
          }
        />
      )}

      {icpReadiness.state === "needs_country_adaptation" && (
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="text-base">Create a country ICP from your existing ICP</CardTitle>
            <CardDescription>
              Your approved {icpReadiness.sourceProfile.country_code} ICP can provide the reusable
              company, industry, technology, buyer-role and value-proposition context. Marketra will
              create a separate {cat?.name ?? tc.country_name} version without changing the original
              or calling Hunter or OpenAI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdaptCountryIcpForm
              projectSlug={projectSlug}
              countryId={tc.id}
              countryCode={tc.country_code}
              countryName={cat?.name ?? tc.country_name}
            />
          </CardContent>
        </Card>
      )}

      {icpReadiness.state === "incomplete" && (
        <EmptyState
          icon={Info}
          title="Complete ICP"
          description={`Finish the required ICP sections: ${icpReadiness.incompleteSections.join(", ")}.`}
          action={
            <Link
              href={`/dashboard/projects/${projectSlug}/markets/${countryCode}/icp`}
              className={buttonVariants()}
            >
              Complete ICP
            </Link>
          }
        />
      )}

      {icpReadiness.state === "source_incomplete" && (
        <EmptyState
          icon={Info}
          title="Complete source ICP"
          description={`Finish the required source sections: ${icpReadiness.incompleteSections.join(", ")}.`}
          action={
            <Link
              href={`/dashboard/projects/${projectSlug}/markets/${icpReadiness.sourceProfile.country_code}/icp`}
              className={buttonVariants()}
            >
              Complete source ICP
            </Link>
          }
        />
      )}

      {icpReadiness.state === "inaccessible" && (
        <EmptyState
          icon={Info}
          title="ICP unavailable"
          description="We could not verify ICP access for this project. Refresh or return to the project."
          action={
            <Link href={`/dashboard/projects/${projectSlug}`} className={buttonVariants()}>
              Return to project
            </Link>
          }
        />
      )}

      {approvedIcp && !discoveryEnabled && (
        <EmptyState
          icon={Info}
          title="Company discovery is unavailable"
          description="The configured company discovery provider is disabled. Your project and ICP are ready and remain unchanged."
          action={
            <Link href="/dashboard/settings" className={buttonVariants()}>
              View integrations
            </Link>
          }
        />
      )}

      {approvedIcp && discoveryEnabled && (
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Discovery filters</CardTitle>
                <CardDescription>
                  Searches use the selected provider without silent fallback. Technology filters may
                  require a paid Hunter plan.
                </CardDescription>
              </div>
              <Badge variant="outline">{providerLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DiscoveryFiltersForm
              projectSlug={projectSlug}
              countryId={tc.id}
              countryName={tc.country_name}
              countryCode={tc.country_code}
              industry={defaultIndustry}
              employeeMin={defaultEmployeeMin}
              employeeMax={defaultEmployeeMax}
              keywords={defaultKeywords}
              technologies={defaultTechnologies}
              disabled={Boolean(
                latestRun && isActiveStatus(latestRun.status as DiscoveryRunStatus),
              )}
              providerMessage={
                env.DEFAULT_COMPANY_DISCOVERY_PROVIDER === "hunter"
                  ? hunterReadiness.message
                  : "Deterministic demo results; never labeled as live."
              }
            />
          </CardContent>
        </Card>
      )}

      <details className="group rounded-lg border border-border/60 bg-surface">
        <summary className="cursor-pointer list-none px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Manual company entry · fallback</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use this only when automated discovery is unavailable or you already know the
                company.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          </div>
        </summary>
        <div className="border-t border-border/60 px-6 py-5">
          <ManualCompanyForm
            projectSlug={projectSlug}
            targetCountryId={tc.id}
            countryCode={tc.country_code}
          />
        </div>
      </details>

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(["discovered", "shortlisted", "approved", "rejected", "archived"] as const).map(
          (status) => (
            <Link
              key={status}
              href={href({ status: filterStatus === status ? "" : status, page: "1" })}
              className={cn(
                "block rounded-lg border border-border/60 bg-surface transition-colors hover:border-primary/30",
                filterStatus === status && "border-primary/40 bg-primary/5",
              )}
            >
              <CardHeader className="pb-1">
                <CardDescription className="text-xs capitalize">{status}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{statusCounts[status] ?? 0}</p>
              </CardContent>
            </Link>
          ),
        )}
      </div>

      {/* Discovery runs history */}
      {runs.length > 0 && (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Discovery Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border rounded-lg border border-border">
              {runs.map((run) => (
                <Link
                  key={run.id}
                  href={`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery/runs/${run.id}`}
                  className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={run.status} />
                    <span className="text-xs text-muted-foreground">
                      {run.provider} · {new Date(run.created_at).toLocaleDateString()}
                    </span>
                    {run.icp_profile_id && (
                      <IcpVersionBadge wsId={wsId} icpProfileId={run.icp_profile_id} />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {run.result_summary &&
                      (run.result_summary as Record<string, unknown>).totalCandidates != null && (
                        <span className="text-xs text-muted-foreground">
                          {
                            (run.result_summary as Record<string, unknown>)
                              .totalCandidates as number
                          }{" "}
                          found
                        </span>
                      )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company results */}
      <CompanyResultsSection
        wsId={wsId}
        projectSlug={projectSlug}
        projectId={project.id}
        targetCountryId={tc.id}
        latestRun={latestRun}
        filterStatus={filterStatus}
        filterSort={filterSort}
        filterPage={filterPage}
        filterMinScore={filterMinScore}
        hrefFn={href}
        pageSize={pageSize}
        countryCode={countryCode}
        canStartDiscovery={Boolean(approvedIcp && discoveryEnabled)}
      />
    </div>
  );
}

async function IcpVersionBadge({
  wsId,
  icpProfileId,
}: {
  wsId: string | undefined;
  icpProfileId: string;
}) {
  if (!wsId) return null;
  const v = await getIcpVersion(icpProfileId, wsId);
  if (!v) return null;
  return <span className="text-xs text-muted-foreground">ICP v{v}</span>;
}

interface CompanyResultsProps {
  wsId: string | undefined;
  projectSlug: string;
  projectId: string;
  targetCountryId: string;
  latestRun: unknown;
  filterStatus: string;
  filterSort: string;
  filterPage: number;
  filterMinScore: number | undefined;
  hrefFn: (fields: Record<string, string | undefined>) => string;
  pageSize: number;
  countryCode: string;
  canStartDiscovery: boolean;
}

async function CompanyResultsSection({
  wsId,
  projectSlug,
  projectId,
  targetCountryId,
  latestRun,
  filterStatus,
  filterSort,
  filterPage,
  filterMinScore,
  hrefFn,
  pageSize,
  countryCode,
  canStartDiscovery,
}: CompanyResultsProps) {
  if (!wsId) return null;

  const options: Record<string, unknown> = {
    targetCountryId,
    pageSize,
    page: filterPage,
    sort: filterSort,
  };
  if (filterStatus) options.status = filterStatus;
  if (filterMinScore !== undefined) options.fitScoreMin = filterMinScore;

  const { items, total } = await listProjectCompanies(wsId, projectId, options);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!latestRun) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Discovered Companies</CardTitle>
          <CardDescription>
            Start a discovery run to find companies matching your ICP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Users}
            title="No companies discovered yet"
            description='Click "Start Discovery" to find matching companies for this market.'
            action={
              canStartDiscovery ? (
                <form
                  action={async (fd: FormData) => {
                    "use server";
                    const m = await import("@/features/companies/api/company-actions");
                    await m.startDiscoveryAction(fd);
                  }}
                >
                  <input type="hidden" name="projectSlug" value={projectSlug} />
                  <input type="hidden" name="countryId" value={targetCountryId} />
                  <DiscoverySubmitButton label="Start Discovery" />
                </form>
              ) : undefined
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Discovered Companies</CardTitle>
          <CardDescription>No companies found matching filters.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Users}
            title="No companies to show"
            description="Try adjusting filters or running a new discovery."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Companies ({total})</CardTitle>
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              defaultValue={filterStatus}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {["discovered", "shortlisted", "approved", "rejected", "archived"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              defaultValue={filterSort}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground"
              aria-label="Sort by"
            >
              <option value="fit_score_desc">Fit ↓</option>
              <option value="fit_score_asc">Fit ↑</option>
              <option value="confidence_desc">Confidence ↓</option>
              <option value="newest">Newest</option>
            </select>
            {filterMinScore !== undefined && (
              <span className="text-xs text-muted-foreground">Min fit: {filterMinScore}</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Fit</th>
                <th className="px-4 py-3 font-medium">Breakdown</th>
                <th className="px-4 py-3 font-medium">Reasons</th>
                <th className="px-4 py-3 font-medium">Signals</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((company) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  projectSlug={projectSlug}
                  countryCode={countryCode}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {filterPage} of {totalPages} ({total} total)
          </p>
          <div className="flex items-center gap-1">
            {filterPage > 1 && (
              <Link
                href={hrefFn({ page: String(filterPage - 1) })}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 w-8 p-0")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            )}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, filterPage - 2);
              const pageNum = start + i;
              if (pageNum > totalPages) return null;
              return (
                <Link
                  key={pageNum}
                  href={hrefFn({ page: String(pageNum) })}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-8 w-8 p-0 tabular-nums",
                    pageNum === filterPage && "bg-primary/10 text-primary font-semibold",
                  )}
                >
                  {pageNum}
                </Link>
              );
            })}
            {filterPage < totalPages && (
              <Link
                href={hrefFn({ page: String(filterPage + 1) })}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 w-8 p-0")}
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function CompanyRow({
  company,
  projectSlug,
  countryCode,
}: {
  company: {
    id: string;
    company_id: string;
    company_name: string;
    company_domain: string | null;
    company_industry: string;
    company_employee_min: number | null;
    company_employee_max: number | null;
    fit_score: number;
    fit_grade: string;
    confidence_score: number;
    status: string;
    provider_rank: number | null;
    qualification_reasons: string[];
    disqualification_reasons: string[];
    matched_signals: string[];
    missing_signals: string[];
    source_provider: string | null;
    company_country_code: string;
    company_city: string | null;
    company_technologies: string[];
    company_fetched_at: string;
  };
  projectSlug: string;
  countryCode: string;
}) {
  return (
    <>
      <tr className="transition-colors hover:bg-muted/20">
        <td className="px-4 py-3">
          <Link
            href={`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery/${company.company_id}`}
            className="space-y-0.5 hover:text-primary transition-colors"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">{company.company_name}</p>
              <Badge variant="outline" className="text-[10px] font-normal">
                {providerProvenanceLabel(company.source_provider)}
              </Badge>
            </div>
            {company.company_domain && (
              <p className="text-xs text-muted-foreground">{company.company_domain}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {[company.company_country_code, company.company_city].filter(Boolean).join(" · ")} ·
              Updated {new Date(company.company_fetched_at).toLocaleDateString()}
            </p>
          </Link>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-muted-foreground">{company.company_industry}</span>
          {company.company_employee_min != null && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {company.company_employee_min}–{company.company_employee_max ?? "∞"} emp.
            </p>
          )}
          {company.company_technologies.length > 0 && (
            <p className="mt-1 max-w-40 truncate text-[11px] text-muted-foreground">
              {company.company_technologies.slice(0, 3).join(", ")}
            </p>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <FitScoreBadge score={company.fit_score} grade={company.fit_grade} />
            {company.provider_rank != null && (
              <span className="text-xs text-muted-foreground">#{company.provider_rank}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <FitScoreBreakdown score={company.fit_score} confidence={company.confidence_score} />
        </td>
        <td className="px-4 py-3 max-w-[200px]">
          <ReasonsTooltip
            qualificationReasons={company.qualification_reasons}
            disqualificationReasons={company.disqualification_reasons}
          />
        </td>
        <td className="px-4 py-3 max-w-[180px]">
          <SignalsTooltip
            matchedSignals={company.matched_signals}
            missingSignals={company.missing_signals}
          />
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={company.status} />
        </td>
        <td className="px-4 py-3">
          <LifecycleActions
            projectSlug={projectSlug}
            pcId={company.id}
            status={company.status as ProjectCompanyStatus}
          />
        </td>
        <td className="px-4 py-3">
          <NotesButton projectSlug={projectSlug} pcId={company.id} />
        </td>
      </tr>
    </>
  );
}

function FitScoreBreakdown({ score, confidence }: { score: number; confidence: number }) {
  const grades: { label: string; pct: number; color: string }[] = [];
  if (score >= 70) {
    grades.push({ label: "Strong", pct: 100, color: "bg-success" });
  } else if (score >= 40) {
    grades.push({ label: "Medium", pct: 60, color: "bg-accent" });
  } else if (score > 0) {
    grades.push({ label: "Weak", pct: 30, color: "bg-warning" });
  } else {
    grades.push({ label: "Disq.", pct: 0, color: "bg-danger" });
  }

  return (
    <div className="group relative flex items-center gap-2">
      <div className="flex h-2 w-16 overflow-hidden rounded-full bg-muted">
        {grades.map((g, i) => (
          <div key={i} className={cn(g.color, "transition-all")} style={{ width: `${g.pct}%` }} />
        ))}
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{confidence}%</span>
    </div>
  );
}

function ReasonsTooltip({
  qualificationReasons,
  disqualificationReasons,
}: {
  qualificationReasons: string[];
  disqualificationReasons: string[];
}) {
  const all = [
    ...qualificationReasons.map((r) => ({ type: "qualification" as const, text: r })),
    ...disqualificationReasons.map((r) => ({ type: "disqualification" as const, text: r })),
  ];
  if (all.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="group relative">
      <span className="inline-flex cursor-help items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <Info className="h-3 w-3" /> {all.length}
      </span>
      <div className="invisible absolute bottom-full left-0 z-10 mb-2 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg group-hover:visible">
        <p className="mb-1.5 text-xs font-semibold text-foreground">Reasons</p>
        <ul className="space-y-1">
          {all.map((r, i) => (
            <li
              key={i}
              className={cn(
                "flex items-start gap-1.5 text-xs",
                r.type === "qualification" ? "text-success" : "text-danger",
              )}
            >
              <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              {r.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SignalsTooltip({
  matchedSignals,
  missingSignals,
}: {
  matchedSignals: string[];
  missingSignals: string[];
}) {
  const all = [
    ...matchedSignals.map((s) => ({ type: "matched" as const, text: s })),
    ...missingSignals.map((s) => ({ type: "missing" as const, text: s })),
  ];
  if (all.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="group relative">
      <span className="inline-flex cursor-help items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <Info className="h-3 w-3" /> {all.length}
      </span>
      <div className="invisible absolute bottom-full left-0 z-10 mb-2 w-64 rounded-lg border border-border bg-surface p-3 shadow-lg group-hover:visible">
        <p className="mb-1.5 text-xs font-semibold text-foreground">Signals</p>
        {matchedSignals.length > 0 && (
          <div className="mb-1.5">
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
              Matched
            </p>
            <ul className="space-y-0.5">
              {matchedSignals.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                  <span className="mt-1 block h-1 w-1 shrink-0 rounded-full bg-success" />
                  {s.replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          </div>
        )}
        {missingSignals.length > 0 && (
          <div>
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Missing
            </p>
            <ul className="space-y-0.5">
              {missingSignals.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="mt-1 block h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  {s.replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function LifecycleActions({
  projectSlug,
  pcId,
  status,
}: {
  projectSlug: string;
  pcId: string;
  status: ProjectCompanyStatus;
}) {
  const lifecycleStatuses = [
    {
      status: "shortlisted" as const,
      icon: CheckCircle,
      label: "Shortlist",
      show: status === "discovered",
    },
    {
      status: "approved" as const,
      icon: CheckCircle,
      label: "Approve",
      show: status === "shortlisted",
    },
    {
      status: "rejected" as const,
      icon: XCircle,
      label: "Reject",
      show: status === "discovered" || status === "shortlisted",
    },
    {
      status: "restore" as const,
      icon: RotateCcw,
      label: "Restore",
      show: status === "rejected" || status === "archived",
    },
    {
      status: "archived" as const,
      icon: Archive,
      label: "Archive",
      show: status === "discovered" || status === "shortlisted" || status === "approved",
    },
  ];

  const visible = lifecycleStatuses.filter((l) => l.show);

  if (visible.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((action) => (
        <form
          key={action.status}
          action={async (fd: FormData) => {
            "use server";
            const m = await import("@/features/companies/api/company-actions");
            const targetStatus = action.status === "restore" ? "discovered" : action.status;
            fd.set("status", targetStatus);
            await m.changeCompanyLifecycleAction(fd);
          }}
        >
          <input type="hidden" name="projectSlug" value={projectSlug} />
          <input type="hidden" name="pcId" value={pcId} />
          <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <action.icon className="h-3 w-3" />
            {action.label}
          </Button>
        </form>
      ))}
    </div>
  );
}

async function NotesButton({ projectSlug, pcId }: { projectSlug: string; pcId: string }) {
  return (
    <form
      action={async (fd: FormData) => {
        "use server";
        const m = await import("@/features/companies/api/company-actions");
        await m.updateCompanyNotesAction(fd);
      }}
      className="inline-flex items-center gap-1"
    >
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <input type="hidden" name="pcId" value={pcId} />
      <input
        name="notes"
        type="text"
        placeholder="Add note…"
        className="h-7 w-20 rounded border border-border bg-transparent px-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <Button type="submit" variant="ghost" size="sm" className="h-7 w-7 p-0">
        <MessageSquare className="h-3 w-3" />
      </Button>
    </form>
  );
}

function isActiveStatus(status: DiscoveryRunStatus): boolean {
  return status === "queued" || status === "running";
}
