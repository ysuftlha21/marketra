"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/session";
import { getProjectService } from "@/features/projects/services/project-service";
import {
  startDiscovery,
  retryDiscovery,
  DiscoveryError,
  safeDiscoveryError,
} from "../services/discovery-execution-service";
import {
  getDiscoveryRun,
  getProjectCompany,
  updateProjectCompanyLifecycle,
  updateProjectCompanyNotes,
} from "../repository/company-repository";
import { createManualCompany, ManualCompanyError } from "../services/manual-company-service";
import { safeRateLimitMessage } from "@/lib/security/rate-limit-service";

export interface ManualCompanyActionState {
  ok?: boolean;
  error?: string;
}

export async function createManualCompanyAction(
  _previous: ManualCompanyActionState | null,
  formData: FormData,
): Promise<ManualCompanyActionState> {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in to add a company." };
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const countryCode = String(formData.get("countryCode") ?? "");
  try {
    await createManualCompany(Object.fromEntries(formData), {
      workspaceId: ctx.activeWorkspace.workspace.id,
      userId: ctx.user.id,
    });
    revalidatePath(`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery`);
    return { ok: true };
  } catch (error) {
    const rateLimitMessage = safeRateLimitMessage(error);
    if (rateLimitMessage) return { error: rateLimitMessage };
    if (error instanceof ManualCompanyError) return { error: error.message };
    return { error: "Company could not be added." };
  }
}

export async function startDiscoveryAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  const maxResults = parseInt(formData.get("maxResults") as string, 10) || 50;

  if (!projectSlug || !countryId) return { error: "Missing fields." };

  const project = await getProjectService(projectSlug);
  if (!project) return { error: "Project not found." };

  try {
    const { runId } = await startDiscovery(
      ctx.activeWorkspace.workspace.id,
      projectSlug,
      countryId,
      ctx.user.id,
      maxResults,
    );
    revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
    return { ok: true, runId };
  } catch (err) {
    const rateLimitMessage = safeRateLimitMessage(err);
    if (rateLimitMessage) return { error: rateLimitMessage };
    if (err instanceof DiscoveryError) return { error: safeDiscoveryError(err.code) };
    return { error: "Discovery failed." };
  }
}

export async function retryDiscoveryAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const projectSlug = formData.get("projectSlug") as string;
  const runId = formData.get("runId") as string;
  if (!projectSlug || !runId) return { error: "Missing fields." };

  const project = await getProjectService(projectSlug);
  if (!project) return { error: "Project not found." };

  const prevRun = await getDiscoveryRun(ctx.activeWorkspace.workspace.id, runId);
  if (!prevRun) return { error: "Run not found." };

  try {
    const result = await retryDiscovery(
      ctx.activeWorkspace.workspace.id,
      projectSlug,
      runId,
      ctx.user.id,
    );
    revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
    return { ok: true, runId: result.runId };
  } catch (err) {
    const rateLimitMessage = safeRateLimitMessage(err);
    if (rateLimitMessage) return { error: rateLimitMessage };
    if (err instanceof DiscoveryError) return { error: safeDiscoveryError(err.code) };
    return { error: "Retry failed." };
  }
}

export async function changeCompanyLifecycleAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const projectSlug = formData.get("projectSlug") as string;
  const pcId = formData.get("pcId") as string;
  const status = formData.get("status") as string;
  if (!projectSlug || !pcId || !status) return { error: "Missing fields." };

  const validStatuses = ["discovered", "shortlisted", "approved", "rejected", "archived"];
  if (!validStatuses.includes(status)) return { error: "Invalid status." };

  const pc = await getProjectCompany(ctx.activeWorkspace.workspace.id, pcId);
  if (!pc) return { error: "Company not found in project." };

  try {
    await updateProjectCompanyLifecycle(
      ctx.activeWorkspace.workspace.id,
      pcId,
      status as "discovered" | "shortlisted" | "approved" | "rejected" | "archived",
      ctx.user.id,
    );
    revalidatePath(`/dashboard/projects/${projectSlug}/discovery`);
    return { ok: true };
  } catch {
    return { error: "Update failed." };
  }
}

export async function updateCompanyNotesAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const projectSlug = formData.get("projectSlug") as string;
  const pcId = formData.get("pcId") as string;
  const notes = formData.get("notes") as string | null;

  if (!projectSlug || !pcId) return { error: "Missing fields." };

  const pc = await getProjectCompany(ctx.activeWorkspace.workspace.id, pcId);
  if (!pc) return { error: "Company not found in project." };

  try {
    await updateProjectCompanyNotes(ctx.activeWorkspace.workspace.id, pcId, notes);
    revalidatePath(`/dashboard/projects/${projectSlug}/discovery`);
    return { ok: true };
  } catch {
    return { error: "Update failed." };
  }
}
