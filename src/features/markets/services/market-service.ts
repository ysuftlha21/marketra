import { getAuthContext } from "@/lib/auth/session";
import { getCountry } from "@/config/countries";
import {
  addTargetCountry as repoAdd,
  getTargetCountryByCode,
  updateTargetCountry,
  deleteTargetCountry,
  listProjectTargetCountries,
  getTargetCountry,
  targetCountryHasAnalysisRuns,
  type TargetCountryRow,
  type TargetCountrySummary,
} from "../repository/market-repository";
import { targetCountryHasIcpProfiles } from "@/features/icp/repository/icp-repository";
import { getProjectService } from "@/features/projects/services/project-service";
import {
  canShortlist,
  canReject,
  canRestore,
  type TargetCountryStatus,
} from "../domain/target-country-status";

export type MarketServiceErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "project_not_found"
  | "country_not_found"
  | "invalid_country_code"
  | "duplicate_country"
  | "invalid_status_transition"
  | "persistence_failure"
  | "cannot_remove_with_history";

export class MarketServiceError extends Error {
  readonly code: MarketServiceErrorCode;
  constructor(code: MarketServiceErrorCode, message: string) {
    super(message);
    this.name = "MarketServiceError";
    this.code = code;
  }
}

export function safeMarketError(code: MarketServiceErrorCode): string {
  const messages: Record<MarketServiceErrorCode, string> = {
    unauthenticated: "Sign in to manage target markets.",
    unauthorized: "You do not have permission for this action.",
    project_not_found: "Project not found.",
    country_not_found: "Target country not found.",
    invalid_country_code: "Invalid country code.",
    duplicate_country: "This country is already added to the project.",
    invalid_status_transition: "Cannot change to this status from the current state.",
    persistence_failure: "Could not save changes. Try again.",
    cannot_remove_with_history:
      "Countries with completed analysis history cannot be removed. Archive or reject instead.",
  };
  return messages[code];
}

export async function addTargetCountryService(
  projectSlug: string,
  countryCode: string,
): Promise<TargetCountryRow> {
  const ctx = await getAuthContext();
  if (!ctx) throw new MarketServiceError("unauthenticated", safeMarketError("unauthenticated"));
  if (!ctx.activeWorkspace)
    throw new MarketServiceError("unauthorized", safeMarketError("unauthorized"));

  const wsId = ctx.activeWorkspace.workspace.id;
  const project = await getProjectService(projectSlug);
  if (!project)
    throw new MarketServiceError("project_not_found", safeMarketError("project_not_found"));

  const country = getCountry(countryCode);
  if (!country)
    throw new MarketServiceError("invalid_country_code", safeMarketError("invalid_country_code"));

  const existing = await getTargetCountryByCode(wsId, project.id, countryCode);
  if (existing)
    throw new MarketServiceError("duplicate_country", safeMarketError("duplicate_country"));

  try {
    return await repoAdd(wsId, project.id, ctx.user.id, country.code, country.name, country.region);
  } catch {
    throw new MarketServiceError("persistence_failure", safeMarketError("persistence_failure"));
  }
}

export async function removeTargetCountryService(
  projectSlug: string,
  countryId: string,
): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) throw new MarketServiceError("unauthenticated", safeMarketError("unauthenticated"));
  if (!ctx.activeWorkspace)
    throw new MarketServiceError("unauthorized", safeMarketError("unauthorized"));

  const wsId = ctx.activeWorkspace.workspace.id;
  const project = await getProjectService(projectSlug);
  if (!project)
    throw new MarketServiceError("project_not_found", safeMarketError("project_not_found"));

  const tc = await getTargetCountry(wsId, countryId);
  if (!tc) throw new MarketServiceError("country_not_found", safeMarketError("country_not_found"));

  const hasRuns = await targetCountryHasAnalysisRuns(wsId, countryId);
  const hasIcp = await targetCountryHasIcpProfiles(wsId, countryId);
  if (hasRuns || hasIcp) {
    throw new MarketServiceError(
      "cannot_remove_with_history",
      safeMarketError("cannot_remove_with_history"),
    );
  }

  try {
    await deleteTargetCountry(wsId, countryId);
  } catch (err) {
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code === "23P01" || pgErr.message?.includes("Cannot delete target country")) {
      throw new MarketServiceError(
        "cannot_remove_with_history",
        safeMarketError("cannot_remove_with_history"),
      );
    }
    throw new MarketServiceError("persistence_failure", safeMarketError("persistence_failure"));
  }
}

export async function updateTargetCountryService(
  projectSlug: string,
  countryId: string,
  data: { notes?: string; priority?: number; analysisAssumptions?: Record<string, unknown> },
): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) throw new MarketServiceError("unauthenticated", safeMarketError("unauthenticated"));
  if (!ctx.activeWorkspace)
    throw new MarketServiceError("unauthorized", safeMarketError("unauthorized"));

  const wsId = ctx.activeWorkspace.workspace.id;
  const project = await getProjectService(projectSlug);
  if (!project)
    throw new MarketServiceError("project_not_found", safeMarketError("project_not_found"));

  const tc = await getTargetCountry(wsId, countryId);
  if (!tc) throw new MarketServiceError("country_not_found", safeMarketError("country_not_found"));

  const update: Record<string, unknown> = {};
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.analysisAssumptions !== undefined)
    update.analysis_assumptions = data.analysisAssumptions;

  try {
    await updateTargetCountry(wsId, countryId, update);
  } catch {
    throw new MarketServiceError("persistence_failure", safeMarketError("persistence_failure"));
  }
}

export async function changeCountryStatusService(
  projectSlug: string,
  countryId: string,
  newStatus: TargetCountryStatus,
): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) throw new MarketServiceError("unauthenticated", safeMarketError("unauthenticated"));
  if (!ctx.activeWorkspace)
    throw new MarketServiceError("unauthorized", safeMarketError("unauthorized"));

  const wsId = ctx.activeWorkspace.workspace.id;
  const project = await getProjectService(projectSlug);
  if (!project)
    throw new MarketServiceError("project_not_found", safeMarketError("project_not_found"));

  const tc = await getTargetCountry(wsId, countryId);
  if (!tc) throw new MarketServiceError("country_not_found", safeMarketError("country_not_found"));

  const currentStatus = tc.status as TargetCountryStatus;

  if (newStatus === "shortlisted" && !canShortlist(currentStatus)) {
    throw new MarketServiceError(
      "invalid_status_transition",
      safeMarketError("invalid_status_transition"),
    );
  }
  if (newStatus === "rejected" && !canReject(currentStatus)) {
    throw new MarketServiceError(
      "invalid_status_transition",
      safeMarketError("invalid_status_transition"),
    );
  }
  if (newStatus === "selected" && !canRestore(currentStatus)) {
    throw new MarketServiceError(
      "invalid_status_transition",
      safeMarketError("invalid_status_transition"),
    );
  }

  const update: Record<string, unknown> = { status: newStatus };
  if (newStatus === "shortlisted") update.shortlisted_at = new Date().toISOString();
  if (newStatus === "rejected") update.rejected_at = new Date().toISOString();
  if (newStatus === "selected") {
    update.shortlisted_at = null;
    update.rejected_at = null;
  }

  try {
    await updateTargetCountry(wsId, countryId, update);
  } catch {
    throw new MarketServiceError("persistence_failure", safeMarketError("persistence_failure"));
  }
}

export async function listProjectTargetCountriesService(
  projectSlug: string,
): Promise<TargetCountrySummary[]> {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  if (!ctx.activeWorkspace) return [];

  const wsId = ctx.activeWorkspace.workspace.id;
  const project = await getProjectService(projectSlug);
  if (!project) return [];

  return listProjectTargetCountries(wsId, project.id);
}

export async function getTargetCountryService(
  projectSlug: string,
  countryCode: string,
): Promise<{ tc: TargetCountryRow; project: { id: string; name: string } } | null> {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  if (!ctx.activeWorkspace) return null;

  const wsId = ctx.activeWorkspace.workspace.id;
  const project = await getProjectService(projectSlug);
  if (!project) return null;

  const tc = await getTargetCountryByCode(wsId, project.id, countryCode);
  if (!tc) return null;

  return { tc, project: { id: project.id, name: project.name } };
}
