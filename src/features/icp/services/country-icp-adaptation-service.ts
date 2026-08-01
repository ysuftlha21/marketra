import { getLatestMarketAnalysisRun } from "@/features/markets/repository/market-repository";
import {
  createIcpProfile,
  getLatestApprovedIcpProfile,
  getLatestApprovedProjectIcpProfile,
  getNextVersion,
  type IcpProfileRow,
} from "../repository/icp-repository";

export type CountryIcpAdaptationErrorCode =
  "source_missing" | "market_analysis_missing" | "persistence_failed";

export class CountryIcpAdaptationError extends Error {
  constructor(readonly code: CountryIcpAdaptationErrorCode) {
    super(code);
    this.name = "CountryIcpAdaptationError";
  }
}

/**
 * Creates a country-owned ICP from an approved profile in the same project/workspace.
 * This is a deterministic copy: it never invokes an AI or discovery provider.
 */
export async function adaptApprovedProjectIcpToCountry(input: {
  workspaceId: string;
  projectId: string;
  targetCountryId: string;
  targetCountryCode: string;
  userId: string;
}): Promise<{ profile: IcpProfileRow; created: boolean }> {
  const existing = await getLatestApprovedIcpProfile(input.workspaceId, input.targetCountryId);
  if (existing) return { profile: existing, created: false };

  const [source, marketRun] = await Promise.all([
    getLatestApprovedProjectIcpProfile(input.workspaceId, input.projectId, input.targetCountryId),
    getLatestMarketAnalysisRun(input.workspaceId, input.targetCountryId),
  ]);
  if (!source) throw new CountryIcpAdaptationError("source_missing");
  if (!marketRun || marketRun.status !== "succeeded") {
    throw new CountryIcpAdaptationError("market_analysis_missing");
  }

  const version = await getNextVersion(input.workspaceId, input.targetCountryId);
  try {
    const profile = await createIcpProfile(input.workspaceId, {
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      project_target_country_id: input.targetCountryId,
      market_analysis_run_id: marketRun.id,
      product_analysis_run_id: source.product_analysis_run_id,
      created_by: input.userId,
      current_generation_run_id: null,
      version,
      status: "approved",
      name: `${source.name} · ${input.targetCountryCode}`,
      summary: source.summary,
      country_code: input.targetCountryCode,
      industry_segments: source.industry_segments,
      company_attributes: source.company_attributes,
      buyer_roles: source.buyer_roles,
      user_roles: source.user_roles,
      pains: source.pains,
      desired_outcomes: source.desired_outcomes,
      purchase_triggers: source.purchase_triggers,
      qualification_signals: source.qualification_signals,
      disqualification_signals: source.disqualification_signals,
      objections: source.objections,
      preferred_channels: source.preferred_channels,
      technology_context: source.technology_context,
      procurement_context: source.procurement_context,
      localization_requirements: source.localization_requirements,
      assumptions: [
        ...source.assumptions,
        `Deterministically adapted from approved ICP ${source.country_code}; review country-specific details.`,
      ],
      missing_information: source.missing_information,
      validation_questions: source.validation_questions,
      confidence: source.confidence,
      confidence_reason: source.confidence_reason,
      user_edits: {
        adaptation: {
          sourceIcpProfileId: source.id,
          sourceCountryCode: source.country_code,
          method: "deterministic_copy_v1",
        },
      },
      approved_by: input.userId,
      approved_at: new Date().toISOString(),
    });
    return { profile, created: true };
  } catch {
    // A concurrent request may have completed first; preserve idempotent behavior.
    const concurrent = await getLatestApprovedIcpProfile(input.workspaceId, input.targetCountryId);
    if (concurrent) return { profile: concurrent, created: false };
    throw new CountryIcpAdaptationError("persistence_failed");
  }
}
