"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/session";
import { getProjectService } from "@/features/projects/services/project-service";
import { generateIcp, IcpGenError, safeIcpError } from "../services/icp-generation-service";
import {
  updateIcpDraft,
  approveIcp,
  rejectIcp,
  restoreIcpToDraft,
  archiveIcp,
  IcpServiceError,
} from "../services/icp-management-service";
import {
  adaptApprovedProjectIcpToCountry,
  CountryIcpAdaptationError,
} from "../services/country-icp-adaptation-service";
import { getTargetCountry } from "@/features/markets/repository/market-repository";
import { randomUUID } from "node:crypto";

export async function generateIcpAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };
  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  const countryCode = String(formData.get("countryCode") ?? "").toUpperCase();
  if (!projectSlug || !countryId) return { error: "Missing fields." };
  const project = await getProjectService(projectSlug);
  if (!project) return { error: "Project not found." };
  try {
    const { runId } = await generateIcp(
      ctx.activeWorkspace.workspace.id,
      project.id,
      countryId,
      projectSlug,
      ctx.user.id,
    );
    revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
    if (countryCode) {
      revalidatePath(`/dashboard/projects/${projectSlug}/markets/${countryCode}/icp`);
      revalidatePath(`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery`);
    }
    revalidatePath("/dashboard/icp");
    revalidatePath("/dashboard", "layout");
    return { ok: true, runId };
  } catch (err) {
    if (err instanceof IcpGenError) return { error: safeIcpError(err.code) };
    return { error: "Generation failed." };
  }
}

export interface GenerateCountryIcpActionState {
  status: "success" | "validation_failed" | "provider_failed" | "inaccessible";
  message: string;
  operationId: string;
}

export async function generateCountryIcpFormAction(
  _previous: GenerateCountryIcpActionState | null,
  formData: FormData,
): Promise<GenerateCountryIcpActionState> {
  const operationId = randomUUID();
  const result = await generateIcpAction(formData);
  if ("ok" in result && result.ok) {
    return { status: "success", message: "Country ICP generated.", operationId };
  }
  const message = ("error" in result && result.error) || "ICP generation failed.";
  return {
    status:
      message === "Project not found." || message === "Sign in."
        ? "inaccessible"
        : "provider_failed",
    message,
    operationId,
  };
}

export interface AdaptCountryIcpActionState {
  status:
    | "success"
    | "already_exists"
    | "source_icp_missing"
    | "source_icp_incomplete"
    | "unauthorized"
    | "inaccessible"
    | "persistence_failed"
    | "validation_failed";
  message: string;
  operationId: string;
}

export async function adaptCountryIcpAction(
  _previous: AdaptCountryIcpActionState | null,
  formData: FormData,
): Promise<AdaptCountryIcpActionState> {
  const operationId = randomUUID();
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace)
    return { status: "inaccessible", message: "Sign in to adapt an ICP.", operationId };
  if (ctx.activeWorkspace.role === "member") {
    return {
      status: "unauthorized",
      message: "Ask a workspace owner or admin to adapt and approve this ICP.",
      operationId,
    };
  }
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const targetCountryId = String(formData.get("countryId") ?? "");
  const countryCode = String(formData.get("countryCode") ?? "").toUpperCase();
  if (!projectSlug || !targetCountryId || !countryCode)
    return { status: "validation_failed", message: "Required fields are missing.", operationId };

  const workspaceId = ctx.activeWorkspace.workspace.id;
  const [project, targetCountry] = await Promise.all([
    getProjectService(projectSlug),
    getTargetCountry(workspaceId, targetCountryId),
  ]);
  if (!project) return { status: "inaccessible", message: "Project is unavailable.", operationId };
  if (
    !targetCountry ||
    targetCountry.project_id !== project.id ||
    targetCountry.country_code !== countryCode
  ) {
    return { status: "inaccessible", message: "Target market is unavailable.", operationId };
  }

  try {
    const result = await adaptApprovedProjectIcpToCountry({
      workspaceId,
      projectId: project.id,
      targetCountryId,
      targetCountryCode: countryCode,
      userId: ctx.user.id,
    });
    revalidatePath(`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery`);
    revalidatePath(`/dashboard/projects/${projectSlug}/markets/${countryCode}/icp`);
    revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
    revalidatePath("/dashboard/icp");
    revalidatePath("/dashboard", "layout");
    return {
      status: result.created ? "success" : "already_exists",
      message: result.created
        ? "Country ICP created. Company Discovery is ready."
        : "This country already has an approved ICP.",
      operationId,
    };
  } catch (error) {
    if (error instanceof CountryIcpAdaptationError) {
      if (error.code === "market_analysis_missing") {
        return {
          status: "validation_failed",
          message: "Complete market analysis before adapting this ICP.",
          operationId,
        };
      }
      if (error.code === "source_missing")
        return {
          status: "source_icp_missing",
          message: "No approved ICP is available to adapt.",
          operationId,
        };
      if (error.code === "source_incomplete")
        return {
          status: "source_icp_incomplete",
          message: "Complete and approve the source ICP before adapting it.",
          operationId,
        };
    }
    console.error("country_icp_adaptation_failed", {
      operation: "country_icp_adaptation",
      operationId,
      safeErrorCode: "persistence_failed",
    });
    return { status: "persistence_failed", message: "The ICP could not be saved.", operationId };
  }
}

export async function approveIcpAction(formData: FormData) {
  const projectSlug = formData.get("projectSlug") as string;
  const icpId = formData.get("icpId") as string;
  if (!projectSlug || !icpId) return { error: "Missing fields." };
  try {
    await approveIcp(icpId);
    revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof IcpServiceError) return { error: err.message };
    return { error: "Approval failed." };
  }
}

export async function rejectIcpAction(formData: FormData) {
  const projectSlug = formData.get("projectSlug") as string;
  const icpId = formData.get("icpId") as string;
  if (!projectSlug || !icpId) return { error: "Missing fields." };
  try {
    await rejectIcp(icpId);
    revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof IcpServiceError) return { error: err.message };
    return { error: "Rejection failed." };
  }
}

export async function restoreIcpAction(formData: FormData) {
  const projectSlug = formData.get("projectSlug") as string;
  const icpId = formData.get("icpId") as string;
  if (!projectSlug || !icpId) return { error: "Missing fields." };
  try {
    await restoreIcpToDraft(icpId);
    revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof IcpServiceError) return { error: err.message };
    return { error: "Restore failed." };
  }
}

export async function archiveIcpAction(formData: FormData) {
  const projectSlug = formData.get("projectSlug") as string;
  const icpId = formData.get("icpId") as string;
  if (!projectSlug || !icpId) return { error: "Missing fields." };
  try {
    await archiveIcp(icpId);
    revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof IcpServiceError) return { error: err.message };
    return { error: "Archive failed." };
  }
}

export async function updateIcpAction(formData: FormData) {
  const projectSlug = formData.get("projectSlug") as string;
  const icpId = formData.get("icpId") as string;
  const name = (formData.get("name") as string) || undefined;
  const summary = (formData.get("summary") as string) || undefined;
  if (!projectSlug || !icpId) return { error: "Missing fields." };
  try {
    await updateIcpDraft(icpId, { name, summary });
    revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
    return { ok: true };
  } catch (err) {
    if (err instanceof IcpServiceError) return { error: err.message };
    return { error: "Update failed." };
  }
}
