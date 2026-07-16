"use server";

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
} from "../services/market-analysis-execution-service";
import { getMarketAnalysisRun } from "../repository/market-repository";

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
  if (!ctx?.activeWorkspace) return;

  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  if (!projectSlug || !countryId) return;

  const project = await getProjectService(projectSlug);
  if (!project) return;

  await runMarketAnalysis({
    workspaceId: ctx.activeWorkspace.workspace.id,
    projectSlug,
    projectId: project.id,
    userId: ctx.user.id,
    targetCountryId: countryId,
  });
  revalidatePath(`/dashboard/projects/${projectSlug}/markets`);
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
