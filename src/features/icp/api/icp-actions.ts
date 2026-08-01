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

export async function generateIcpAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };
  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
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
    revalidatePath("/dashboard", "layout");
    return { ok: true, runId };
  } catch (err) {
    if (err instanceof IcpGenError) return { error: safeIcpError(err.code) };
    return { error: "Generation failed." };
  }
}

export interface AdaptCountryIcpActionState {
  ok?: boolean;
  error?: string;
}

export async function adaptCountryIcpAction(
  _previous: AdaptCountryIcpActionState | null,
  formData: FormData,
): Promise<AdaptCountryIcpActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in to adapt an ICP." };
  if (ctx.activeWorkspace.role === "member") {
    return { error: "Ask a workspace owner or admin to adapt and approve this ICP." };
  }
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const targetCountryId = String(formData.get("countryId") ?? "");
  const countryCode = String(formData.get("countryCode") ?? "").toUpperCase();
  if (!projectSlug || !targetCountryId || !countryCode) return { error: "Missing fields." };

  const workspaceId = ctx.activeWorkspace.workspace.id;
  const [project, targetCountry] = await Promise.all([
    getProjectService(projectSlug),
    getTargetCountry(workspaceId, targetCountryId),
  ]);
  if (!project) return { error: "Project not found." };
  if (
    !targetCountry ||
    targetCountry.project_id !== project.id ||
    targetCountry.country_code !== countryCode
  ) {
    return { error: "Target market was not found." };
  }

  try {
    await adaptApprovedProjectIcpToCountry({
      workspaceId,
      projectId: project.id,
      targetCountryId,
      targetCountryCode: countryCode,
      userId: ctx.user.id,
    });
    revalidatePath(`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery`);
    revalidatePath(`/dashboard/projects/${projectSlug}/markets/${countryCode}/icp`);
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    if (error instanceof CountryIcpAdaptationError) {
      if (error.code === "market_analysis_missing") {
        return { error: "Complete market analysis before adapting this ICP." };
      }
      if (error.code === "source_missing")
        return { error: "No approved project ICP is available." };
    }
    return { error: "The country ICP could not be created." };
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
