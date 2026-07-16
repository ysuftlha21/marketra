import { createServerClient } from "@/lib/db/supabase-server";
import type { DiscoveryRunStatus } from "../domain/discovery-run-status";
import type { ProjectCompanyStatus } from "../domain/company-lifecycle";

export interface CompanyDiscoveryRunRow {
  id: string;
  workspace_id: string;
  project_id: string;
  target_country_id: string;
  icp_profile_id: string | null;
  provider: string;
  provider_version: string;
  status: DiscoveryRunStatus;
  input_snapshot: Record<string, unknown>;
  criteria_snapshot: Record<string, unknown>;
  result_summary: Record<string, unknown>;
  error_code: string | null;
  safe_error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyRow {
  id: string;
  workspace_id: string;
  canonical_name: string;
  normalized_name: string;
  primary_domain: string | null;
  normalized_domain: string | null;
  website_url: string | null;
  country_code: string;
  headquarters_city: string | null;
  industry: string;
  industry_tags: string[];
  employee_count_min: number | null;
  employee_count_max: number | null;
  employee_count_estimate: number | null;
  annual_revenue_min: number | null;
  annual_revenue_max: number | null;
  annual_revenue_currency: string;
  company_type: string | null;
  founded_year: number | null;
  technology_signals: string[];
  growth_signals: string[];
  source_provider: string | null;
  source_external_id: string | null;
  source_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCompanyRow {
  id: string;
  workspace_id: string;
  project_id: string;
  target_country_id: string;
  company_id: string;
  discovery_run_id: string;
  icp_profile_id: string | null;
  status: ProjectCompanyStatus;
  fit_score: number;
  fit_grade: string;
  qualification_reasons: string[];
  disqualification_reasons: string[];
  matched_signals: string[];
  missing_signals: string[];
  confidence_score: number;
  scoring_snapshot: Record<string, unknown>;
  provider_rank: number | null;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCompanySummary {
  id: string;
  company_id: string;
  status: ProjectCompanyStatus;
  fit_score: number;
  fit_grade: string;
  confidence_score: number;
  qualification_reasons: string[];
  disqualification_reasons: string[];
  matched_signals: string[];
  missing_signals: string[];
  provider_rank: number | null;
  created_at: string;
  company_name: string;
  company_domain: string | null;
  company_industry: string;
  company_employee_min: number | null;
  company_employee_max: number | null;
  company_country_code: string;
}

export interface ProjectCompanyOutreachContext {
  projectCompanyId: string;
  discoveryRunId: string;
  companyName: string;
  industry: string;
  employeeCountMin: number | null;
  employeeCountMax: number | null;
  countryCode: string;
  headquartersCity: string | null;
  fitScore: number;
  qualificationReasons: string[];
  disqualificationReasons: string[];
  purchaseSignals: string[];
  discoveryEvidence: string[];
}

const RUN_COLS =
  "id, workspace_id, project_id, target_country_id, icp_profile_id, provider, provider_version, status, input_snapshot, criteria_snapshot, result_summary, error_code, safe_error_message, started_at, completed_at, failed_at, created_by, created_at, updated_at";
const COMPANY_COLS =
  "id, workspace_id, canonical_name, normalized_name, primary_domain, normalized_domain, website_url, country_code, headquarters_city, industry, industry_tags, employee_count_min, employee_count_max, employee_count_estimate, annual_revenue_min, annual_revenue_max, annual_revenue_currency, company_type, founded_year, technology_signals, growth_signals, source_provider, source_external_id, source_url, first_seen_at, last_seen_at, created_at, updated_at";
const PC_COLS =
  "id, workspace_id, project_id, target_country_id, company_id, discovery_run_id, icp_profile_id, status, fit_score, fit_grade, qualification_reasons, disqualification_reasons, matched_signals, missing_signals, confidence_score, scoring_snapshot, provider_rank, reviewer_notes, reviewed_by, reviewed_at, archived_at, created_at, updated_at";

type Supabase = Awaited<ReturnType<typeof createServerClient>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbQuery = any;

function runsQuery(supabase: Supabase): DbQuery {
  return supabase.from("company_discovery_runs" as never);
}
function companiesQuery(supabase: Supabase): DbQuery {
  return supabase.from("companies" as never);
}
function pcsQuery(supabase: Supabase): DbQuery {
  return supabase.from("project_companies" as never);
}

async function client() {
  return await createServerClient();
}

// ── Discovery run functions ─────────────────────────────────────

export async function createDiscoveryRun(
  _wsId: string,
  data: Record<string, unknown>,
): Promise<CompanyDiscoveryRunRow> {
  const supabase = await client();
  const r = await runsQuery(supabase).insert(data).select(RUN_COLS).single();
  if (r.error) throw new Error(`Failed to create discovery run: ${r.error.message}`);
  return r.data as unknown as CompanyDiscoveryRunRow;
}

export async function updateDiscoveryRun(
  wsId: string,
  runId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const supabase = await client();
  const r = await runsQuery(supabase)
    .update(data)
    .eq("workspace_id" as never, wsId)
    .eq("id" as never, runId);
  if (r.error) throw new Error(`Failed to update discovery run: ${r.error.message}`);
}

export async function findActiveDiscoveryRun(
  wsId: string,
  targetCountryId: string,
): Promise<CompanyDiscoveryRunRow | null> {
  const supabase = await client();
  const r = await runsQuery(supabase)
    .select(RUN_COLS)
    .eq("workspace_id" as never, wsId)
    .eq("target_country_id" as never, targetCountryId)
    .in("status" as never, ["queued", "running"] as never)
    .maybeSingle();
  return (r.data as unknown as CompanyDiscoveryRunRow) ?? null;
}

export async function getDiscoveryRun(
  wsId: string,
  runId: string,
): Promise<CompanyDiscoveryRunRow | null> {
  const supabase = await client();
  const r = await runsQuery(supabase)
    .select(RUN_COLS)
    .eq("workspace_id" as never, wsId)
    .eq("id" as never, runId)
    .maybeSingle();
  return (r.data as unknown as CompanyDiscoveryRunRow) ?? null;
}

export async function listDiscoveryRuns(
  wsId: string,
  projectId: string,
): Promise<CompanyDiscoveryRunRow[]> {
  const supabase = await client();
  const r = await runsQuery(supabase)
    .select(RUN_COLS)
    .eq("workspace_id" as never, wsId)
    .eq("project_id" as never, projectId)
    .order("created_at" as never, { ascending: false } as never);
  return (r.data as unknown as CompanyDiscoveryRunRow[]) ?? [];
}

// ── Company functions ───────────────────────────────────────────

export async function findCompanyByNormalizedDomain(
  wsId: string,
  normalizedDomain: string,
): Promise<CompanyRow | null> {
  const supabase = await client();
  const r = await companiesQuery(supabase)
    .select(COMPANY_COLS)
    .eq("workspace_id" as never, wsId)
    .eq("normalized_domain" as never, normalizedDomain)
    .maybeSingle();
  return (r.data as unknown as CompanyRow) ?? null;
}

export async function upsertCompany(data: Record<string, unknown>): Promise<CompanyRow> {
  const supabase = await client();
  const r = await companiesQuery(supabase)
    .upsert(data, {
      onConflict: "workspace_id,normalized_domain" as never,
      ignoreDuplicates: false,
    })
    .select(COMPANY_COLS)
    .single();
  if (r.error || !r.data) throw new Error(`Failed to upsert company: ${r.error?.message}`);
  return r.data as unknown as CompanyRow;
}

// ── Project company functions ───────────────────────────────────

export async function projectCompanyExists(
  wsId: string,
  projectId: string,
  targetCountryId: string,
  companyId: string,
): Promise<boolean> {
  const supabase = await client();
  const r = await pcsQuery(supabase)
    .select("id", { count: "exact", head: true } as never)
    .eq("workspace_id" as never, wsId)
    .eq("project_id" as never, projectId)
    .eq("target_country_id" as never, targetCountryId)
    .eq("company_id" as never, companyId);
  return ((r.data as unknown[])?.length ?? 0) > 0;
}

export async function createProjectCompany(
  data: Record<string, unknown>,
): Promise<ProjectCompanyRow> {
  const supabase = await client();
  const r = await pcsQuery(supabase).insert(data).select(PC_COLS).single();
  if (r.error || !r.data) throw new Error(`Failed to create project company: ${r.error.message}`);
  return r.data as unknown as ProjectCompanyRow;
}

export async function listProjectCompanies(
  wsId: string,
  projectId: string,
  options: Record<string, unknown> = {},
): Promise<{ items: ProjectCompanySummary[]; total: number }> {
  const supabase = await client();
  const pageSize = (options.pageSize as number) ?? 25;
  const page = (options.page as number) ?? 1;
  const from = (page - 1) * pageSize;

  let query = pcsQuery(supabase)
    .select(
      `id, company_id, status, fit_score, fit_grade, confidence_score,
       qualification_reasons, disqualification_reasons, matched_signals, missing_signals,
       provider_rank, created_at,
       companies!inner(canonical_name, primary_domain, industry, employee_count_min, employee_count_max, country_code)`,
      { count: "exact" } as never,
    )
    .eq("workspace_id" as never, wsId)
    .eq("project_id" as never, projectId);

  if (options.targetCountryId)
    query = query.eq("target_country_id" as never, options.targetCountryId);
  if (options.status) query = query.eq("status" as never, options.status);
  if (options.fitScoreMin !== undefined)
    query = query.gte("fit_score" as never, options.fitScoreMin);
  if (options.fitScoreMax !== undefined)
    query = query.lte("fit_score" as never, options.fitScoreMax);
  if (options.confidenceMin !== undefined)
    query = query.gte("confidence_score" as never, options.confidenceMin);
  if (options.discoveryRunId) query = query.eq("discovery_run_id" as never, options.discoveryRunId);

  const sort = (options.sort as string) ?? "fit_score_desc";
  if (sort === "fit_score_desc")
    query = query.order("fit_score" as never, { ascending: false } as never);
  else if (sort === "fit_score_asc")
    query = query.order("fit_score" as never, { ascending: true } as never);
  else if (sort === "confidence_desc")
    query = query.order("confidence_score" as never, { ascending: false } as never);
  else if (sort === "newest")
    query = query.order("created_at" as never, { ascending: false } as never);

  query = query.range(from, from + pageSize - 1);
  const r = await query;

  const items: ProjectCompanySummary[] = ((r.data as Record<string, unknown>[]) ?? []).map(
    (row) => {
      const company = row.companies as Record<string, unknown> | undefined;
      return {
        id: row.id as string,
        company_id: row.company_id as string,
        status: row.status as ProjectCompanyStatus,
        fit_score: row.fit_score as number,
        fit_grade: row.fit_grade as string,
        confidence_score: row.confidence_score as number,
        qualification_reasons: row.qualification_reasons as string[],
        disqualification_reasons: row.disqualification_reasons as string[],
        matched_signals: row.matched_signals as string[],
        missing_signals: row.missing_signals as string[],
        provider_rank: row.provider_rank as number | null,
        created_at: row.created_at as string,
        company_name: (company?.canonical_name as string) ?? "",
        company_domain: (company?.primary_domain as string) ?? null,
        company_industry: (company?.industry as string) ?? "",
        company_employee_min: (company?.employee_count_min as number) ?? null,
        company_employee_max: (company?.employee_count_max as number) ?? null,
        company_country_code: (company?.country_code as string) ?? "",
      };
    },
  );

  return { items, total: r.count ?? 0 };
}

export async function getProjectCompany(
  wsId: string,
  projectCompanyId: string,
): Promise<ProjectCompanyRow | null> {
  const supabase = await client();
  const r = await pcsQuery(supabase)
    .select(PC_COLS)
    .eq("workspace_id" as never, wsId)
    .eq("id" as never, projectCompanyId)
    .maybeSingle();
  return (r.data as unknown as ProjectCompanyRow) ?? null;
}

export async function getProjectCompanyOutreachContext(
  wsId: string,
  projectId: string,
  targetCountryId: string,
  companyId: string,
): Promise<ProjectCompanyOutreachContext | null> {
  const supabase = await client();
  const result = await pcsQuery(supabase)
    .select(
      `id, discovery_run_id, fit_score, qualification_reasons, disqualification_reasons,
       matched_signals, scoring_snapshot,
       companies!inner(canonical_name, industry, employee_count_min, employee_count_max,
         country_code, headquarters_city, growth_signals, technology_signals, source_url)`,
    )
    .eq("workspace_id" as never, wsId)
    .eq("project_id" as never, projectId)
    .eq("target_country_id" as never, targetCountryId)
    .eq("company_id" as never, companyId)
    .maybeSingle();

  if (result.error) throw result.error;
  if (!result.data) return null;

  const row = result.data as unknown as Record<string, unknown>;
  const company =
    row.companies && typeof row.companies === "object"
      ? (row.companies as Record<string, unknown>)
      : {};
  const growthSignals = Array.isArray(company.growth_signals)
    ? company.growth_signals.map(String)
    : [];
  const technologySignals = Array.isArray(company.technology_signals)
    ? company.technology_signals.map(String)
    : [];
  const matchedSignals = Array.isArray(row.matched_signals) ? row.matched_signals.map(String) : [];
  const sourceUrl = typeof company.source_url === "string" ? company.source_url : null;

  return {
    projectCompanyId: typeof row.id === "string" ? row.id : "",
    discoveryRunId: typeof row.discovery_run_id === "string" ? row.discovery_run_id : "",
    companyName: typeof company.canonical_name === "string" ? company.canonical_name : "",
    industry: typeof company.industry === "string" ? company.industry : "",
    employeeCountMin:
      typeof company.employee_count_min === "number" ? company.employee_count_min : null,
    employeeCountMax:
      typeof company.employee_count_max === "number" ? company.employee_count_max : null,
    countryCode: typeof company.country_code === "string" ? company.country_code : "",
    headquartersCity:
      typeof company.headquarters_city === "string" ? company.headquarters_city : null,
    fitScore: typeof row.fit_score === "number" ? row.fit_score : 0,
    qualificationReasons: Array.isArray(row.qualification_reasons)
      ? row.qualification_reasons.map(String)
      : [],
    disqualificationReasons: Array.isArray(row.disqualification_reasons)
      ? row.disqualification_reasons.map(String)
      : [],
    purchaseSignals: growthSignals,
    discoveryEvidence: [
      ...matchedSignals,
      ...technologySignals,
      ...(sourceUrl ? [`Source: ${sourceUrl}`] : []),
    ],
  };
}

export async function updateProjectCompanyLifecycle(
  wsId: string,
  projectCompanyId: string,
  status: ProjectCompanyStatus,
  reviewedBy: string,
): Promise<void> {
  const supabase = await client();
  const data: Record<string, unknown> = {
    status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
  };
  if (status === "archived") data.archived_at = new Date().toISOString();
  const r = await pcsQuery(supabase)
    .update(data)
    .eq("workspace_id" as never, wsId)
    .eq("id" as never, projectCompanyId);
  if (r.error) throw new Error(`Failed to update lifecycle: ${r.error.message}`);
}

export async function updateProjectCompanyNotes(
  wsId: string,
  projectCompanyId: string,
  reviewerNotes: string | null,
): Promise<void> {
  const supabase = await client();
  const r = await pcsQuery(supabase)
    .update({ reviewer_notes: reviewerNotes } as never)
    .eq("workspace_id" as never, wsId)
    .eq("id" as never, projectCompanyId);
  if (r.error) throw new Error(`Failed to update notes: ${r.error.message}`);
}

export async function countProjectCompaniesByStatus(
  wsId: string,
  projectId: string,
  targetCountryId: string,
): Promise<Record<string, number>> {
  const supabase = await client();
  const r = await pcsQuery(supabase)
    .select("status")
    .eq("workspace_id" as never, wsId)
    .eq("project_id" as never, projectId)
    .eq("target_country_id" as never, targetCountryId);
  if (r.error) return {};
  const rows = (r.data as unknown as Array<Record<string, unknown>>) ?? [];
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const s = row.status as string;
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}

export async function listCompanyDiscoveryFilters(
  wsId: string,
  projectId: string,
): Promise<{ industries: string[]; countries: string[] }> {
  const supabase = await client();
  const r = await pcsQuery(supabase)
    .select("company_id")
    .eq("workspace_id" as never, wsId)
    .eq("project_id" as never, projectId);
  const rows = (r.data as unknown as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) return { industries: [], countries: [] };

  const companyIds = rows.map((r) => r.company_id as string);
  const cr = await companiesQuery(supabase)
    .select("industry, country_code")
    .eq("workspace_id" as never, wsId)
    .in("id" as never, companyIds);
  const cRows = (cr.data as unknown as Array<Record<string, unknown>>) ?? [];
  const industries = new Set<string>();
  const countries = new Set<string>();
  for (const row of cRows) {
    if (row.industry) industries.add(row.industry as string);
    if (row.country_code) countries.add(row.country_code as string);
  }
  return { industries: Array.from(industries).sort(), countries: Array.from(countries).sort() };
}
