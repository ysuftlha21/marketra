import { getProjectBySlug } from "@/features/projects/repository/project-repository";
import { getTargetCountry } from "@/features/markets/repository/market-repository";
import { enforceRateLimit } from "@/lib/security/rate-limit-service";
import { normalizeCompany } from "../domain/company-normalization";
import {
  createDiscoveryRun,
  createProjectCompany,
  findCompanyByNormalizedDomain,
  findCompanyByNormalizedName,
  projectCompanyExists,
  upsertCompany,
} from "../repository/company-repository";
import { manualCompanySchema } from "../schema/manual-company-schema";

export class ManualCompanyError extends Error {
  constructor(
    readonly code: "invalid_input" | "not_found" | "duplicate" | "persistence_failed",
    message: string,
  ) {
    super(message);
    this.name = "ManualCompanyError";
  }
}

export async function createManualCompany(
  input: unknown,
  context: {
    workspaceId: string;
    userId: string;
  },
) {
  const parsed = manualCompanySchema.safeParse(input);
  if (!parsed.success) {
    throw new ManualCompanyError(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid company details.",
    );
  }
  const value = parsed.data;
  await enforceRateLimit({
    operation: "manual_company_create",
    workspaceId: context.workspaceId,
    userId: context.userId,
    limit: 20,
  });

  const [project, targetCountry] = await Promise.all([
    getProjectBySlug(context.workspaceId, value.projectSlug),
    getTargetCountry(context.workspaceId, value.targetCountryId),
  ]);
  if (!project || !targetCountry || targetCountry.project_id !== project.id) {
    throw new ManualCompanyError("not_found", "Project market was not found.");
  }
  if (targetCountry.country_code !== value.countryCode) {
    throw new ManualCompanyError(
      "invalid_input",
      "Company country must match the selected market.",
    );
  }

  const normalized = normalizeCompany({ name: value.companyName, websiteUrl: value.websiteUrl });
  const existing = normalized.normalizedDomain
    ? await findCompanyByNormalizedDomain(context.workspaceId, normalized.normalizedDomain)
    : await findCompanyByNormalizedName(context.workspaceId, normalized.normalizedName);
  if (
    existing &&
    (await projectCompanyExists(context.workspaceId, project.id, targetCountry.id, existing.id))
  ) {
    throw new ManualCompanyError(
      "duplicate",
      "This company is already in the selected project market.",
    );
  }

  try {
    const company =
      existing ??
      (await upsertCompany({
        workspace_id: context.workspaceId,
        canonical_name: value.companyName,
        normalized_name: normalized.normalizedName,
        primary_domain: normalized.normalizedDomain,
        normalized_domain: normalized.normalizedDomain,
        website_url: value.websiteUrl ?? null,
        country_code: value.countryCode,
        headquarters_city: value.city || null,
        industry: value.industry,
        employee_count_min: value.employeeMin ?? null,
        employee_count_max: value.employeeMax ?? null,
        technology_signals: value.technologySignals,
        growth_signals: value.purchaseSignals,
        source_provider: "manual",
        source_url: value.sourceUrl ?? null,
        source_snapshot: { description: value.description },
      }));
    const now = new Date().toISOString();
    const run = await createDiscoveryRun(context.workspaceId, {
      workspace_id: context.workspaceId,
      project_id: project.id,
      target_country_id: targetCountry.id,
      provider: "manual",
      provider_version: "1.0.0",
      status: "completed",
      input_snapshot: { source: "manual_entry" },
      criteria_snapshot: {},
      result_summary: { totalCandidates: 1 },
      started_at: now,
      completed_at: now,
      created_by: context.userId,
    });
    return await createProjectCompany({
      workspace_id: context.workspaceId,
      project_id: project.id,
      target_country_id: targetCountry.id,
      company_id: company.id,
      discovery_run_id: run.id,
      status: "discovered",
      fit_score: 0,
      fit_grade: "weak",
      confidence_score: 0,
      qualification_reasons: [],
      disqualification_reasons: [],
      matched_signals: [...value.technologySignals, ...value.purchaseSignals],
      missing_signals: ["Manual company has not been qualified yet."],
      scoring_snapshot: { source: "manual", deterministic: true },
      reviewer_notes: value.notes || null,
    });
  } catch (error) {
    if (error instanceof ManualCompanyError) throw error;
    throw new ManualCompanyError("persistence_failed", "Company could not be added.");
  }
}
