"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/session";
import { getProjectService } from "@/features/projects/services/project-service";
import {
  addTargetCountryService,
  removeTargetCountryService,
  updateTargetCountryService,
  changeCountryStatusService,
} from "../services/market-service";
import {
  runMarketAnalysis,
  retryMarketAnalysis,
  MarketAnalysisServiceError,
  safeMarketAnalysisError,
} from "../services/market-analysis-execution-service";
import { getMarketAnalysisRun, getTargetCountry } from "../repository/market-repository";
import { RateLimitExceededError } from "@/lib/providers/rate-limit/rate-limit.provider";

export async function addTargetCountryAction(formData: FormData) {
  const projectSlug = formData.get("projectSlug") as string;
  const countryCode = formData.get("countryCode") as string;
  if (!projectSlug || !countryCode) return;
  await addTargetCountryService(projectSlug, countryCode);
  revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
}

export async function removeTargetCountryAction(formData: FormData) {
  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  if (!projectSlug || !countryId) return;
  await removeTargetCountryService(projectSlug, countryId);
  revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
}

export async function updateTargetCountryAction(formData: FormData) {
  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  const notes = (formData.get("notes") as string) || undefined;
  if (!projectSlug || !countryId) return;
  await updateTargetCountryService(projectSlug, countryId, { notes });
  revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
}

export async function shortlistCountryAction(formData: FormData) {
  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  if (!projectSlug || !countryId) return;
  await changeCountryStatusService(projectSlug, countryId, "shortlisted");
  revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
}

export async function rejectCountryAction(formData: FormData) {
  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  if (!projectSlug || !countryId) return;
  await changeCountryStatusService(projectSlug, countryId, "rejected");
  revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
}

export async function restoreCountryAction(formData: FormData) {
  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  if (!projectSlug || !countryId) return;
  await changeCountryStatusService(projectSlug, countryId, "selected");
  revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
}

export async function runMarketAnalysisAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) {
    throw new MarketAnalysisServiceError(
      "unauthenticated",
      safeMarketAnalysisError("unauthenticated"),
    );
  }

  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  if (!projectSlug || !countryId) {
    throw new MarketAnalysisServiceError(
      "country_not_found",
      safeMarketAnalysisError("country_not_found"),
    );
  }

  const project = await getProjectService(projectSlug);
  if (!project) {
    throw new MarketAnalysisServiceError(
      "project_not_found",
      safeMarketAnalysisError("project_not_found"),
    );
  }

  const targetCountry = await getTargetCountry(ctx.activeWorkspace.workspace.id, countryId);
  if (!targetCountry || targetCountry.project_id !== project.id) {
    throw new MarketAnalysisServiceError(
      "country_not_found",
      safeMarketAnalysisError("country_not_found"),
    );
  }

  await runMarketAnalysis({
    workspaceId: ctx.activeWorkspace.workspace.id,
    projectSlug,
    projectId: project.id,
    userId: ctx.user.id,
    targetCountryId: countryId,
  });
  revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
  revalidatePath(`/dashboard/projects/${projectSlug}/markets/${targetCountry.country_code}`);
  revalidatePath(`/dashboard/projects/${projectSlug}/markets/${targetCountry.country_code}/icp`);
  revalidatePath(
    `/dashboard/projects/${projectSlug}/markets/${targetCountry.country_code}/discovery`,
  );
  revalidatePath("/dashboard", "layout");
}

export interface RunMarketAnalysisActionState {
  status: "success" | "running" | "rate_limited" | "unauthorized" | "inaccessible" | "failed";
  message: string;
  reference: string;
}

export async function runMarketAnalysisFormAction(
  _previous: RunMarketAnalysisActionState | null,
  formData: FormData,
): Promise<RunMarketAnalysisActionState> {
  const operationId = randomUUID();
  try {
    await runMarketAnalysisAction(formData);
    return {
      status: "success",
      message: "Market analysis completed.",
      reference: `MARKET-ANALYSIS-${operationId}`,
    };
  } catch (error) {
    const code = error instanceof MarketAnalysisServiceError ? error.code : null;
    const status =
      code === "analysis_already_running"
        ? "running"
        : code === "unauthorized" || code === "unauthenticated"
          ? "unauthorized"
          : code === "country_not_found" || code === "project_not_found"
            ? "inaccessible"
            : error instanceof RateLimitExceededError
              ? "rate_limited"
              : "failed";
    const reference =
      error instanceof MarketAnalysisServiceError && error.safeReference
        ? error.safeReference
        : error instanceof RateLimitExceededError
          ? "AI-PROVIDER-RATE"
          : code === "provider_timeout"
            ? "AI-PROVIDER-TIMEOUT"
            : code === "invalid_provider_response"
              ? "AI-PROVIDER-OUTPUT"
              : code === "persistence_failure"
                ? "MARKET-ANALYSIS-PERSIST"
                : status === "unauthorized"
                  ? "MARKET-ANALYSIS-PERMISSION"
                  : "AI-PROVIDER-UNAVAILABLE";
    console.error("market_analysis_action_failed", {
      operation: "market_analysis",
      operationId,
      safeErrorCode: reference,
    });
    return {
      status,
      message:
        error instanceof MarketAnalysisServiceError
          ? safeMarketAnalysisError(error.code)
          : status === "rate_limited"
            ? "Too many analysis attempts. Please wait before trying again."
            : "Market analysis could not be completed.",
      reference: `${reference}-${operationId}`,
    };
  }
}

export async function retryMarketAnalysisAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return;

  const projectSlug = formData.get("projectSlug") as string;
  const previousRunId = formData.get("previousRunId") as string;
  if (!projectSlug || !previousRunId) return;

  const project = await getProjectService(projectSlug);
  if (!project) return;

  const prevRun = await getMarketAnalysisRun(ctx.activeWorkspace.workspace.id, previousRunId);
  if (!prevRun) return;

  await retryMarketAnalysis(
    {
      workspaceId: ctx.activeWorkspace.workspace.id,
      projectSlug,
      projectId: project.id,
      userId: ctx.user.id,
      targetCountryId: prevRun.project_target_country_id,
    },
    previousRunId,
  );
  revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
}
