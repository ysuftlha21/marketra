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

export type DiscoveryErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "project_not_found"
  | "country_not_found"
  | "icp_not_found"
  | "icp_not_approved"
  | "already_running"
  | "provider_unavailable"
  | "provider_timeout"
  | "invalid_provider_response"
  | "configuration_missing"
  | "provider_authentication"
  | "provider_plan_denied"
  | "provider_rate_limited"
  | "persistence_failure";

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
    provider_unavailable: "Discovery provider unavailable.",
    provider_timeout: "Discovery timed out.",
    invalid_provider_response: "Unexpected response.",
    configuration_missing: "Configuration missing.",
    provider_authentication: "Hunter is not configured for this operation.",
    provider_plan_denied: "The Hunter plan does not allow this operation.",
    provider_rate_limited: "Hunter rate limit reached. Please wait before trying again.",
    persistence_failure: "Save failed.",
  };
  return m[code];
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
    purchaseTriggers: [],
    disqualificationSignals: (icp.disqualification_signals as string[]) ?? [],
    hasDomain: !!candidate.primaryDomain,
    hasEmployeeData: candidate.employeeCountMin !== null || candidate.employeeCountMax !== null,
    hasRevenueData: candidate.annualRevenueMin !== null || candidate.annualRevenueMax !== null,
  };
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
        technologies?: string[];
        page?: number;
      } = {},
): Promise<{ runId: string }> {
  await enforceRateLimit({ operation: "company_discovery", workspaceId: wsId, userId, limit: 10 });
  const env = parseServerEnv();
  const options = typeof optionsOrMax === "number" ? { maxResults: optionsOrMax } : optionsOrMax;
  const maxResults = options.maxResults ?? 50;
  if (env.DEFAULT_COMPANY_DISCOVERY_PROVIDER === "hunter" && !env.HUNTER_DISCOVERY_UI_ENABLED) {
    throw new DiscoveryError("configuration_missing", "Hunter UI activation is disabled.");
  }

  const project = await getProjectService(projectSlug);
  if (!project)
    throw new DiscoveryError("project_not_found", safeDiscoveryError("project_not_found"));

  const tc = await getTargetCountry(wsId, targetCountryId);
  if (!tc) throw new DiscoveryError("country_not_found", safeDiscoveryError("country_not_found"));

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

  const inputSnapshot = {
    project: {
      name: project.name,
      productDescription: project.product_description,
      websiteUrl: project.website_url,
    },
    country: { code: tc.country_code, name: tc.country_name },
    maxResults,
    filters: options,
  };

  const criteriaSnapshot = {
    industries: icp.industry_segments,
    companyAttributes: icp.company_attributes,
    buyerRoles: icp.buyer_roles,
    qualificationSignals: icp.qualification_signals,
    disqualificationSignals: icp.disqualification_signals,
  };

  const provider = createCompanyDiscoveryProvider(env.DEFAULT_COMPANY_DISCOVERY_PROVIDER, {
    hunterClient:
      env.DEFAULT_COMPANY_DISCOVERY_PROVIDER === "hunter" ? createHunterClient(env) : undefined,
  });
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
  const operationId = randomUUID();
  const recordsPaidProviderUsage = provider.id !== "mock";
  let safeFailureStage: "allowance" | "provider" | "usage_record" = recordsPaidProviderUsage
    ? "allowance"
    : "provider";
  try {
    if (recordsPaidProviderUsage) await assertProviderAllowance(wsId, "company_search");
    safeFailureStage = "provider";
    providerResult = await provider.discoverCompaniesV1({
      correlationId: `disc_${run.id}`,
      targetCountryCode: tc.country_code,
      industries: options.industry
        ? [options.industry]
        : (((criteriaSnapshot.industries as Record<string, unknown>).primary as string[]) ?? []),
      companySizeMinEmployees: options.employeeMin,
      companySizeMaxEmployees: options.employeeMax,
      companyTypes: [],
      qualificationSignals: (criteriaSnapshot.qualificationSignals as string[]) ?? [],
      disqualificationSignals: (criteriaSnapshot.disqualificationSignals as string[]) ?? [],
      technologySignals: options.technologies ?? [],
      keywords: options.keywords,
      purchaseTriggers: [],
      exclusionDomains: [],
      maxResults,
      offset: ((options.page ?? 1) - 1) * maxResults,
    });
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
    const msg = err instanceof Error ? err.message : "Unknown";
    const code: DiscoveryErrorCode =
      err instanceof HunterProviderError
        ? err.category === "authentication"
          ? "provider_authentication"
          : err.category === "authorization"
            ? "provider_plan_denied"
            : err.category === "rate_limit"
              ? "provider_rate_limited"
              : err.category === "invalid_response"
                ? "invalid_provider_response"
                : "provider_unavailable"
        : err instanceof ProviderUsageError
          ? err.code === "limit_reached"
            ? "provider_plan_denied"
            : "provider_unavailable"
          : msg.includes("timeout")
            ? "provider_timeout"
            : "provider_unavailable";
    console.error("company_discovery_provider_failed", {
      operation: "company_discovery",
      operationId,
      providerId: provider.id,
      safeFailureStage,
      safeErrorCode: code,
    });
    if (recordsPaidProviderUsage) {
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
      safeErrorCode: "persistence_failure",
    });
    await updateDiscoveryRun(wsId, run.id, {
      status: "failed",
      error_code: "persistence_failure",
      safe_error_message: safeDiscoveryError("persistence_failure"),
      failed_at: new Date().toISOString(),
    }).catch(() => undefined);
    throw new DiscoveryError(
      "persistence_failure",
      safeDiscoveryError("persistence_failure"),
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
  return startDiscovery(wsId, projectSlug, prevRun.target_country_id, userId, {
    maxResults: (prevRun.input_snapshot.maxResults as number) ?? 50,
  });
}
