import { createCompanyDiscoveryProvider } from "@/lib/providers/company-discovery/company-discovery.factory";
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
import { getLatestIcpProfile, type IcpProfileRow } from "@/features/icp/repository/icp-repository";
import { normalizeDomain } from "../domain/company-normalization";
import { calculateFitScore } from "../domain/company-scoring";
import type { ScoringInput } from "../domain/company-scoring";
import type { DiscoveryCompanyCandidate } from "@/lib/providers/company-discovery/company-discovery.provider";
import { parseServerEnv } from "@/lib/env/env";

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
  | "persistence_failure";

export class DiscoveryError extends Error {
  readonly code: DiscoveryErrorCode;
  constructor(c: DiscoveryErrorCode, m: string) {
    super(m);
    this.name = "DiscoveryError";
    this.code = c;
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
  maxResults = 50,
): Promise<{ runId: string }> {
  const env = parseServerEnv();

  const project = await getProjectService(projectSlug);
  if (!project)
    throw new DiscoveryError("project_not_found", safeDiscoveryError("project_not_found"));

  const tc = await getTargetCountry(wsId, targetCountryId);
  if (!tc) throw new DiscoveryError("country_not_found", safeDiscoveryError("country_not_found"));

  const icp = await getLatestIcpProfile(wsId, targetCountryId);
  if (!icp) throw new DiscoveryError("icp_not_found", safeDiscoveryError("icp_not_found"));
  if (icp.status !== "approved")
    throw new DiscoveryError("icp_not_approved", safeDiscoveryError("icp_not_approved"));

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
  };

  const criteriaSnapshot = {
    industries: icp.industry_segments,
    companyAttributes: icp.company_attributes,
    buyerRoles: icp.buyer_roles,
    qualificationSignals: icp.qualification_signals,
    disqualificationSignals: icp.disqualification_signals,
  };

  const provider = createCompanyDiscoveryProvider(env.DEFAULT_COMPANY_DISCOVERY_PROVIDER);
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
  try {
    providerResult = await provider.discoverCompaniesV1({
      correlationId: `disc_${run.id}`,
      targetCountryCode: tc.country_code,
      industries:
        ((criteriaSnapshot.industries as Record<string, unknown>).primary as string[]) ?? [],
      companyTypes: [],
      qualificationSignals: (criteriaSnapshot.qualificationSignals as string[]) ?? [],
      disqualificationSignals: (criteriaSnapshot.disqualificationSignals as string[]) ?? [],
      technologySignals: [],
      purchaseTriggers: [],
      exclusionDomains: [],
      maxResults,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    const code: DiscoveryErrorCode = msg.includes("timeout")
      ? "provider_timeout"
      : "provider_unavailable";
    await updateDiscoveryRun(wsId, run.id, {
      status: "failed",
      error_code: code,
      safe_error_message: safeDiscoveryError(code),
      failed_at: new Date().toISOString(),
    });
    throw new DiscoveryError(code, safeDiscoveryError(code));
  }

  const output = providerResult.data;
  const candidates = output.candidates;
  let savedCount = 0;
  let qualifiedCount = 0;

  for (const candidate of candidates) {
    savedCount++;

    const nd = normalizeDomain(candidate.primaryDomain ?? candidate.websiteUrl ?? "");
    let companyId: string;
    const existing = nd ? await findCompanyByNormalizedDomain(wsId, nd) : null;
    if (existing) {
      companyId = existing.id;
    } else {
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

    const exists = await projectCompanyExists(wsId, project.id, targetCountryId, companyId);
    if (exists) continue;

    const score = calculateFitScore(buildScoringInput(candidate, icp, tc.country_code));

    if (score.fitScore >= 30) {
      qualifiedCount++;
    }

    await createProjectCompany({
      workspace_id: wsId,
      project_id: project.id,
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
      provider_rank: savedCount,
      reviewer_notes: null,
      reviewed_by: null,
      reviewed_at: null,
      archived_at: null,
    });
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
  return startDiscovery(
    wsId,
    projectSlug,
    prevRun.target_country_id,
    userId,
    (prevRun.input_snapshot.maxResults as number) ?? 50,
  );
}
