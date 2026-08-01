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
