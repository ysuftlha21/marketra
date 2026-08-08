import { createCompanyDiscoveryProvider } from "@/lib/providers/company-discovery/company-discovery.factory";
import { createHunterClient } from "@/lib/providers/hunter/hunter-config";
import {
  createDiscoveryRun,
  updateDiscoveryRun,
  findActiveDiscoveryRun,
  getDiscoveryRun,
  upsertCompany,
  findCompanyByNormalizedDomain,
  projectCompanyExists,
  createProjectCompany,
} from "../repository/company-repository";
import { getProjectService } from "@/features/projects/services/project-service";
import { getTargetCountry } from "@/features/markets/repository/market-repository";
import {
  getLatestApprovedIcpProfile,
  getLatestIcpProfile,
  type IcpProfileRow,
} from "@/features/icp/repository/icp-repository";
import { normalizeDomain } from "../domain/company-normalization";
import { calculateFitScore } from "../domain/company-scoring";
import type { ScoringInput } from "../domain/company-scoring";
import type { DiscoveryCompanyCandidate } from "@/lib/providers/company-discovery/company-discovery.provider";
import { parseServerEnv } from "@/lib/env/env";
import { enforceRateLimit } from "@/lib/security/rate-limit-service";
import { HunterProviderError } from "@/lib/providers/hunter/hunter-client";
import {
  assertProviderAllowance,
  ProviderUsageError,
  recordProviderOperation,
} from "./provider-usage-service";
import { randomUUID } from "node:crypto";
import {
  RateLimitExceededError,
  RateLimitProviderUnavailableError,
} from "@/lib/providers/rate-limit/rate-limit.provider";
import { restoreSubmittedDiscoveryFilters } from "../domain/discovery-filter-snapshot";

export type DiscoveryErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "project_not_found"
  | "country_not_found"
  | "icp_not_found"
  | "icp_not_approved"
  | "already_running"
  | "hunter_configuration_missing"
  | "hunter_authentication_failed"
  | "hunter_permission_denied"
  | "hunter_plan_restricted"
  | "hunter_rate_limited"
  | "hunter_timeout"
  | "hunter_connectivity_failed"
  | "hunter_server_error"
  | "hunter_invalid_request"
  | "hunter_response_invalid"
  | "hunter_no_results"
  | "discovery_persistence_failed"
  | "durable_rate_limit_failed"
  | "discovery_rate_limited"
  | "entitlement_denied"
  | "provider_usage_failed"
  | "provider_internal_error";

export class DiscoveryError extends Error {
  readonly code: DiscoveryErrorCode;
  constructor(
    c: DiscoveryErrorCode,
    m: string,
    readonly operationId?: string,
  ) {
    super(m);
    this.name = "DiscoveryError";
    this.code = c;
  }
}

class DiscoveryPersistenceError extends Error {
  constructor(readonly stage: "company_lookup" | "company_insert" | "project_link") {
    super(stage);
    this.name = "DiscoveryPersistenceError";
  }
}

export function safeDiscoveryError(code: DiscoveryErrorCode): string {
  const m: Record<DiscoveryErrorCode, string> = {
    unauthenticated: "Sign in to discover companies.",
    unauthorized: "No permission.",
    project_not_found: "Project not found.",
    country_not_found: "Target country not found.",
    icp_not_found: "Generate an ICP first.",
    icp_not_approved: "Approve the ICP before discovering companies.",
    already_running: "A discovery is already running for this country.",
    hunter_configuration_missing: "Hunter is not configured for this operation.",
    hunter_authentication_failed: "Hunter authentication failed.",
    hunter_permission_denied: "This Hunter account cannot perform company discovery.",
    hunter_plan_restricted: "This Hunter account does not allow this discovery operation.",
    hunter_rate_limited: "The discovery request was rate-limited. Please wait and try again.",
    hunter_timeout: "Hunter did not respond in time. Please try again.",
    hunter_connectivity_failed: "Hunter could not be reached. Please try again shortly.",
    hunter_server_error: "Hunter is temporarily unavailable. Try again shortly.",
    hunter_invalid_request: "The selected filters are not supported.",
    hunter_response_invalid: "Hunter returned an unsupported response.",
    hunter_no_results: "Hunter found no companies for these filters.",
    discovery_persistence_failed: "Companies were found but could not be saved.",
    durable_rate_limit_failed: "Discovery is temporarily unavailable. Please try again shortly.",
    discovery_rate_limited: "Too many discovery attempts. Please wait before trying again.",
    entitlement_denied: "Your current plan has reached its company discovery limit.",
    provider_usage_failed: "Provider usage could not be recorded. No results were saved.",
    provider_internal_error: "The discovery provider encountered a temporary error.",
  };
  return m[code];
}

export function discoveryErrorReference(code: DiscoveryErrorCode): string {
  const references: Record<DiscoveryErrorCode, string> = {
    unauthenticated: "DISCOVERY-AUTHORIZATION",
    unauthorized: "DISCOVERY-AUTHORIZATION",
    project_not_found: "DISCOVERY-CONTEXT",
    country_not_found: "DISCOVERY-CONTEXT",
    icp_not_found: "DISCOVERY-ICP",
    icp_not_approved: "DISCOVERY-ICP",
    already_running: "DISCOVERY-RUNNING",
    hunter_configuration_missing: "DISCOVERY-CONFIG",
    hunter_authentication_failed: "DISCOVERY-AUTH",
    hunter_permission_denied: "DISCOVERY-PERMISSION",
    hunter_plan_restricted: "DISCOVERY-PLAN",
    hunter_rate_limited: "DISCOVERY-RATE",
    hunter_timeout: "DISCOVERY-TIMEOUT",
    hunter_connectivity_failed: "DISCOVERY-CONNECTIVITY",
    hunter_server_error: "DISCOVERY-SERVER",
    hunter_invalid_request: "DISCOVERY-REQUEST",
    hunter_response_invalid: "DISCOVERY-OUTPUT",
    hunter_no_results: "DISCOVERY-NO-RESULTS",
    discovery_persistence_failed: "DISCOVERY-PERSIST",
    durable_rate_limit_failed: "DISCOVERY-LIMIT",
    discovery_rate_limited: "DISCOVERY-LIMIT",
    entitlement_denied: "DISCOVERY-ENTITLEMENT",
    provider_usage_failed: "DISCOVERY-USAGE",
    provider_internal_error: "DISCOVERY-PROVIDER",
  };
  return references[code];
}

function buildScoringInput(
  candidate: DiscoveryCompanyCandidate,
  icp: IcpProfileRow,
  targetCountryCode: string,
): ScoringInput {
  return {
    industry: candidate.industry || "Unknown",
    targetIndustries: [
      ...(((icp.industry_segments as Record<string, unknown>).primary as string[]) ?? []),
      ...(((icp.industry_segments as Record<string, unknown>).secondary as string[]) ?? []),
    ],
    employeeMin: candidate.employeeCountMin ?? null,
    employeeMax: candidate.employeeCountMax ?? null,
    targetEmployeeMin: null,
    targetEmployeeMax: null,
    countryCode: candidate.countryCode,
    targetCountryCode,
    revenueMin: candidate.annualRevenueMin ?? null,
    revenueMax: candidate.annualRevenueMax ?? null,
    companyType: candidate.companyType ?? null,
    targetCompanyTypes: [],
    technologySignals: candidate.technologySignals ?? [],
    targetTechnologySignals: [],
    qualificationSignals: (icp.qualification_signals as string[]) ?? [],
    purchaseTriggers: (icp.purchase_triggers as string[]) ?? [],
    disqualificationSignals: (icp.disqualification_signals as string[]) ?? [],
    hasDomain: !!candidate.primaryDomain,
    hasEmployeeData: candidate.employeeCountMin !== null || candidate.employeeCountMax !== null,
    hasRevenueData: candidate.annualRevenueMin !== null || candidate.annualRevenueMax !== null,
  };
}

function icpIndustryNames(icp: IcpProfileRow): string[] {
  const segments = icp.industry_segments as Record<string, unknown>;
  return [segments.primary, segments.secondary]
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .map((value) =>
      typeof value === "string"
        ? value
        : value && typeof value === "object" && "name" in value
          ? String(value.name)
          : "",
    )
    .filter(Boolean);
}

function mapDiscoveryProviderError(
  error: unknown,
  stage: "provider" | "run_metadata" | "usage_record",
): DiscoveryErrorCode {
  if (stage === "usage_record") return "provider_usage_failed";
  if (stage === "run_metadata") return "discovery_persistence_failed";
  if (!(error instanceof HunterProviderError)) return "provider_internal_error";
  const categories: Record<HunterProviderError["category"], DiscoveryErrorCode> = {
    authentication: "hunter_authentication_failed",
    permission_denied: "hunter_permission_denied",
    plan_restricted: "hunter_plan_restricted",
    rate_limit: "hunter_rate_limited",
    not_found: "hunter_invalid_request",
    invalid_request: "hunter_invalid_request",
    timeout: "hunter_timeout",
    connectivity: "hunter_connectivity_failed",
    server_error: "hunter_server_error",
    provider_unavailable: "provider_internal_error",
    invalid_response: "hunter_response_invalid",
  };
  return categories[error.category];
}

export async function startDiscovery(
  wsId: string,
  projectSlug: string,
  targetCountryId: string,
  userId: string,
  optionsOrMax:
    | number
    | {
        maxResults?: number;
        industry?: string;
        employeeMin?: number;
        employeeMax?: number;
        keywords?: string[];
        keywordMatchMode?: "any" | "all";
        technologies?: string[];
        page?: number;
      } = {},
): Promise<{ runId: string }> {
  const operationId = randomUUID();
  const options = typeof optionsOrMax === "number" ? { maxResults: optionsOrMax } : optionsOrMax;
  const maxResults = options.maxResults ?? 5;

  const project = await getProjectService(projectSlug);
  if (!project)
    throw new DiscoveryError("project_not_found", safeDiscoveryError("project_not_found"));

  const tc = await getTargetCountry(wsId, targetCountryId);
  if (!tc || tc.project_id !== project.id)
    throw new DiscoveryError("country_not_found", safeDiscoveryError("country_not_found"));

  const approvedIcp = await getLatestApprovedIcpProfile(wsId, targetCountryId);
  const latestIcp = approvedIcp ? null : await getLatestIcpProfile(wsId, targetCountryId);
  if (!approvedIcp && !latestIcp)
    throw new DiscoveryError("icp_not_found", safeDiscoveryError("icp_not_found"));
  if (!approvedIcp)
    throw new DiscoveryError("icp_not_approved", safeDiscoveryError("icp_not_approved"));
  const icp = approvedIcp;
  const targetProject = project;
  const targetCountry = tc;

  const active = await findActiveDiscoveryRun(wsId, targetCountryId);
  if (active) throw new DiscoveryError("already_running", safeDiscoveryError("already_running"));

  const env = parseServerEnv();
  if (env.DEFAULT_COMPANY_DISCOVERY_PROVIDER === "hunter" && !env.HUNTER_DISCOVERY_UI_ENABLED) {
    throw new DiscoveryError(
      "hunter_configuration_missing",
      safeDiscoveryError("hunter_configuration_missing"),
      operationId,
    );
  }
  const recordsPaidProviderUsage = env.DEFAULT_COMPANY_DISCOVERY_PROVIDER !== "mock";
  if (recordsPaidProviderUsage) {
    try {
      await assertProviderAllowance(wsId, "company_search");
    } catch (error) {
      const code: DiscoveryErrorCode =
        error instanceof ProviderUsageError && error.code === "limit_reached"
          ? "entitlement_denied"
          : "provider_internal_error";
      throw new DiscoveryError(code, safeDiscoveryError(code), operationId);
    }
  }
  try {
    await enforceRateLimit({
      operation: "company_discovery",
      workspaceId: wsId,
      projectId: project.id,
      userId,
      limit: 10,
    });
  } catch (error) {
    const code: DiscoveryErrorCode =
      error instanceof RateLimitExceededError
        ? "discovery_rate_limited"
        : error instanceof RateLimitProviderUnavailableError
          ? "durable_rate_limit_failed"
          : "durable_rate_limit_failed";
    throw new DiscoveryError(code, safeDiscoveryError(code), operationId);
  }

  const submittedFilters = {
    industry:
      options.industry === undefined
        ? { state: "absent" as const }
        : options.industry.length === 0
          ? { state: "empty" as const, value: "" }
          : { state: "populated" as const, value: options.industry },
    keywords:
      options.keywords === undefined
        ? { state: "absent" as const }
        : options.keywords.length === 0
          ? { state: "empty" as const, values: [] }
          : { state: "populated" as const, values: options.keywords },
    technologies:
      options.technologies === undefined
        ? { state: "absent" as const }
        : options.technologies.length === 0
          ? { state: "empty" as const, values: [] }
          : { state: "populated" as const, values: options.technologies },
    keywordMatchMode: options.keywordMatchMode ?? "any",
    employeeMin: options.employeeMin ?? null,
    employeeMax: options.employeeMax ?? null,
    resultCap: maxResults,
    page: options.page ?? 1,
  };
  const inputSnapshot: Record<string, unknown> = {
    project: {
      name: project.name,
      productDescription: project.product_description,
      websiteUrl: project.website_url,
    },
    country: { code: tc.country_code, name: tc.country_name },
    submittedFilters,
  };

  const criteriaSnapshot = {
    industries: icp.industry_segments,
    companyAttributes: icp.company_attributes,
    buyerRoles: icp.buyer_roles,
    qualificationSignals: icp.qualification_signals,
    disqualificationSignals: icp.disqualification_signals,
  };

  let provider: ReturnType<typeof createCompanyDiscoveryProvider>;
  try {
    provider = createCompanyDiscoveryProvider(env.DEFAULT_COMPANY_DISCOVERY_PROVIDER, {
      hunterClient:
        env.DEFAULT_COMPANY_DISCOVERY_PROVIDER === "hunter" ? createHunterClient(env) : undefined,
    });
  } catch {
    throw new DiscoveryError(
      "hunter_configuration_missing",
      safeDiscoveryError("hunter_configuration_missing"),
      operationId,
    );
  }
  const run = await createDiscoveryRun(wsId, {
    workspace_id: wsId,
    project_id: project.id,
    target_country_id: targetCountryId,
    icp_profile_id: icp.id,
    provider: provider.id,
    provider_version: provider.version,
    status: "queued",
    input_snapshot: inputSnapshot,
    criteria_snapshot: criteriaSnapshot,
    created_by: userId,
  });

  await updateDiscoveryRun(wsId, run.id, {
    status: "running",
    started_at: new Date().toISOString(),
  });

  let providerResult;
  let providerCallStarted = false;
  let safeFailureStage: "provider" | "run_metadata" | "usage_record" = "provider";
  try {
    providerCallStarted = true;
    providerResult = await provider.discoverCompaniesV1({
      correlationId: `disc_${run.id}`,
      targetCountryCode: tc.country_code,
      industries: options.industry ? [options.industry] : icpIndustryNames(icp),
      companySizeMinEmployees: options.employeeMin,
      companySizeMaxEmployees: options.employeeMax,
      companyTypes: [],
      qualificationSignals: (criteriaSnapshot.qualificationSignals as string[]) ?? [],
      disqualificationSignals: (criteriaSnapshot.disqualificationSignals as string[]) ?? [],
      technologySignals: options.technologies ?? [],
      keywords: options.keywords,
      keywordMatchMode: options.keywordMatchMode ?? "any",
      keywordSubmissionState:
        options.keywords === undefined
          ? "absent"
          : options.keywords.length === 0
            ? "empty"
            : "populated",
      technologySubmissionState:
        options.technologies === undefined
          ? "absent"
          : options.technologies.length === 0
            ? "empty"
            : "populated",
      purchaseTriggers: [],
      exclusionDomains: [],
      maxResults,
      offset: ((options.page ?? 1) - 1) * maxResults,
    });
    safeFailureStage = "run_metadata";
    if (providerResult.data.providerFilters) {
      inputSnapshot.providerFilters = providerResult.data.providerFilters;
      await updateDiscoveryRun(wsId, run.id, { input_snapshot: inputSnapshot });
    }
    if (recordsPaidProviderUsage) {
      safeFailureStage = "usage_record";
      await recordProviderOperation({
        workspaceId: wsId,
        projectId: project.id,
        operation: "company_search",
        providerId: provider.id,
        operationId,
        idempotencyKey: `${run.id}:company_search`,
        success: true,
      });
    }
  } catch (err) {
    const code = mapDiscoveryProviderError(err, safeFailureStage);
    console.error("company_discovery_provider_failed", {
      operation: "company_discovery",
      operationId,
      providerId: provider.id,
      safeFailureStage,
      safeErrorCode: code,
    });
    if (recordsPaidProviderUsage && providerCallStarted && safeFailureStage !== "usage_record") {
      await recordProviderOperation({
        workspaceId: wsId,
        projectId: project.id,
        operation: "company_search",
        providerId: provider.id,
        operationId,
        idempotencyKey: `${run.id}:company_search`,
        success: false,
        errorCode: code,
      }).catch(() => undefined);
    }
    await updateDiscoveryRun(wsId, run.id, {
      status: "failed",
      error_code: code,
      safe_error_message: safeDiscoveryError(code),
      failed_at: new Date().toISOString(),
    });
    throw new DiscoveryError(code, safeDiscoveryError(code), operationId);
  }

  const output = providerResult.data;
  const candidates = output.candidates;
  let savedCount = 0;
  let qualifiedCount = 0;
  let persistenceStage: "company_lookup" | "company_insert" | "project_link" = "company_lookup";

  async function persistCandidate(
    candidate: DiscoveryCompanyCandidate,
    providerRank: number,
  ): Promise<boolean> {
    let stage: DiscoveryPersistenceError["stage"] = "company_lookup";
    try {
      const nd = normalizeDomain(candidate.primaryDomain ?? candidate.websiteUrl ?? "");
      let companyId: string;
      const existing = nd ? await findCompanyByNormalizedDomain(wsId, nd) : null;
      if (existing) {
        companyId = existing.id;
      } else {
        stage = "company_insert";
        const created = await upsertCompany({
          workspace_id: wsId,
          canonical_name: candidate.name,
          normalized_name: candidate.normalizedName,
          primary_domain: candidate.primaryDomain ?? null,
          normalized_domain: nd,
          website_url: candidate.websiteUrl ?? null,
          country_code: candidate.countryCode,
          headquarters_city: candidate.headquartersCity ?? null,
          industry: candidate.industry,
          industry_tags: candidate.industryTags ?? [],
          employee_count_min: candidate.employeeCountMin ?? null,
          employee_count_max: candidate.employeeCountMax ?? null,
          employee_count_estimate: candidate.employeeCountEstimate ?? null,
          annual_revenue_min: candidate.annualRevenueMin ?? null,
          annual_revenue_max: candidate.annualRevenueMax ?? null,
          annual_revenue_currency: candidate.annualRevenueCurrency ?? "USD",
          company_type: candidate.companyType ?? null,
          founded_year: candidate.foundedYear ?? null,
          technology_signals: candidate.technologySignals ?? [],
          growth_signals: candidate.growthSignals ?? [],
          source_provider: provider.id,
          source_external_id: candidate.sourceExternalId ?? null,
          source_url: candidate.sourceUrl ?? null,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        });
        companyId = created.id;
      }

      stage = "project_link";
      const exists = await projectCompanyExists(wsId, targetProject.id, targetCountryId, companyId);
      if (exists) return false;
      const score = calculateFitScore(
        buildScoringInput(candidate, icp, targetCountry.country_code),
      );
      await createProjectCompany({
        workspace_id: wsId,
        project_id: targetProject.id,
        target_country_id: targetCountryId,
        company_id: companyId,
        discovery_run_id: run.id,
        icp_profile_id: icp.id,
        status: "discovered",
        fit_score: score.fitScore,
        fit_grade: score.fitGrade,
        qualification_reasons: score.qualificationReasons,
        disqualification_reasons: score.disqualificationReasons,
        matched_signals: score.matchedSignals,
        missing_signals: score.missingSignals,
        confidence_score: score.confidenceScore,
        scoring_snapshot: score.scoringSnapshot,
        provider_rank: providerRank,
        reviewer_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        archived_at: null,
      });
      return score.fitScore >= 30;
    } catch {
      throw new DiscoveryPersistenceError(stage);
    }
  }

  try {
    const batchSize = 5;
    for (let index = 0; index < candidates.length; index += batchSize) {
      const batch = candidates.slice(index, index + batchSize);
      const results = await Promise.all(
        batch.map((candidate, offset) => persistCandidate(candidate, index + offset + 1)),
      );
      savedCount += batch.length;
      qualifiedCount += results.filter(Boolean).length;
    }
  } catch (error) {
    if (error instanceof DiscoveryPersistenceError) persistenceStage = error.stage;
    console.error("company_discovery_persistence_failed", {
      operation: "company_discovery",
      operationId,
      providerId: provider.id,
      safeFailureStage: persistenceStage,
      safeErrorCode: "discovery_persistence_failed",
    });
    await updateDiscoveryRun(wsId, run.id, {
      status: "failed",
      error_code: "discovery_persistence_failed",
      safe_error_message: safeDiscoveryError("discovery_persistence_failed"),
      failed_at: new Date().toISOString(),
    }).catch(() => undefined);
    throw new DiscoveryError(
      "discovery_persistence_failed",
      safeDiscoveryError("discovery_persistence_failed"),
      operationId,
    );
  }

  const resultSummary = {
    totalCandidates: savedCount,
    qualifiedCount,
    disqualifiedCount: savedCount - qualifiedCount,
  };

  await updateDiscoveryRun(wsId, run.id, {
    status: "completed",
    completed_at: new Date().toISOString(),
    result_summary: resultSummary,
  });

  return { runId: run.id };
}

export async function retryDiscovery(
  wsId: string,
  projectSlug: string,
  runId: string,
  userId: string,
): Promise<{ runId: string }> {
  const prevRun = await getDiscoveryRun(wsId, runId);
  if (!prevRun)
    throw new DiscoveryError("country_not_found", safeDiscoveryError("country_not_found"));
  const restored = restoreSubmittedDiscoveryFilters(prevRun.input_snapshot);
  return startDiscovery(
    wsId,
    projectSlug,
    prevRun.target_country_id,
    userId,
    restored
      ? {
          maxResults: restored.maxResults,
          industry: restored.industry,
          employeeMin: restored.employeeMin,
          employeeMax: restored.employeeMax,
          keywords: restored.keywords,
          technologies: restored.technologies,
          keywordMatchMode: restored.keywordMatchMode,
          page: restored.page,
        }
      : { maxResults: 5 },
  );
}
