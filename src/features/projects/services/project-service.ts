import {
  createProject,
  updateProject,
  deleteProject,
  getProjectBySlug,
  listWorkspaceProjects,
  getExistingSlugs,
  getLatestAnalysisRun,
  listAnalysisRuns,
  saveClarificationAnswer,
  getClarificationAnswers,
  type ProjectRow,
  type ProjectSummaryRow,
  type AnalysisRunRow,
  type ClarificationAnswerRow,
} from "../repository/project-repository";
import { getAuthContext } from "@/lib/auth/session";
import { slugifyProjectName } from "../domain/slug";
import { canDeleteProject, canEditProject } from "../domain/project-status";
import type { ProjectStatus } from "../domain/project-status";
import type { CreateProjectInput, UpdateProjectInput } from "../schema/project-schemas";

import {
  checkProjectCreationAllowance,
  consumeProjectCreation,
  checkActiveProjectsAllowance,
} from "@/features/workspaces/services/workspace-usage-service";
import { getPlan } from "@/config/plans";

export type ProjectServiceErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "project_not_found"
  | "slug_taken"
  | "invalid_input"
  | "forbidden"
  | "plan_limit_reached"
  | "persistence_failure";

export class ProjectServiceError extends Error {
  readonly code: ProjectServiceErrorCode;
  constructor(code: ProjectServiceErrorCode, message: string) {
    super(message);
    this.name = "ProjectServiceError";
    this.code = code;
  }
}

export function safeProjectError(code: ProjectServiceErrorCode, detail?: string): string {
  const messages: Record<ProjectServiceErrorCode, string> = {
    unauthenticated: "Sign in to manage projects.",
    unauthorized: "You do not have permission to perform this action.",
    project_not_found: "Project not found.",
    slug_taken: "A project with this slug already exists in your workspace.",
    invalid_input: detail ?? "Invalid input.",
    forbidden: "You do not have permission to perform this action.",
    plan_limit_reached: detail ?? "Plan limit reached.",
    persistence_failure: "Could not save changes. Try again.",
  };
  return messages[code];
}

export async function createProjectService(data: CreateProjectInput): Promise<ProjectRow> {
  const ctx = await getAuthContext();
  if (!ctx) throw new ProjectServiceError("unauthenticated", safeProjectError("unauthenticated"));
  if (!ctx.activeWorkspace)
    throw new ProjectServiceError("unauthorized", safeProjectError("unauthorized"));

  const workspaceId = ctx.activeWorkspace.workspace.id;
  const slug = data.slug || slugifyProjectName(data.name);
  const existingSlugs = await getExistingSlugs(workspaceId);
  if (existingSlugs.includes(slug.toLowerCase())) {
    throw new ProjectServiceError("slug_taken", safeProjectError("slug_taken"));
  }

  const plan = getPlan("free")!; // Default to free plan for now

  try {
    await checkActiveProjectsAllowance(workspaceId, plan);
    await checkProjectCreationAllowance(workspaceId, plan);
  } catch (err) {
    throw new ProjectServiceError(
      "plan_limit_reached",
      safeProjectError("plan_limit_reached", (err as Error).message),
    );
  }

  let project;
  try {
    project = await createProject(workspaceId, ctx.user.id, {
      name: data.name,
      slug,
      websiteUrl: data.websiteUrl,
      productDescription: data.productDescription,
      targetCustomerSummary: data.targetCustomerSummary,
      businessModel: data.businessModel,
      pricingSummary: data.pricingSummary,
      currentMarkets: data.currentMarkets ?? [],
      preferredLanguage: data.preferredLanguage ?? "en",
    });
  } catch {
    throw new ProjectServiceError("persistence_failure", safeProjectError("persistence_failure"));
  }

  // Consume usage event post-creation. We use project id as idempotency key.
  try {
    await consumeProjectCreation(workspaceId, `create_project_${project.id}`, plan);
  } catch (err) {
    // If usage event fails to record, we shouldn't fail the creation but log it (or we could fail it, but the project is already created).
    // Given the MVP nature, we log it. In a real system, use a transaction.
    console.error(
      `Failed to record project creation usage for workspace ${workspaceId}, project ${project.id}:`,
      err,
    );
  }

  return project;
}

export async function updateProjectService(
  slug: string,
  data: UpdateProjectInput,
): Promise<ProjectRow> {
  const ctx = await getAuthContext();
  if (!ctx) throw new ProjectServiceError("unauthenticated", safeProjectError("unauthenticated"));
  if (!ctx.activeWorkspace)
    throw new ProjectServiceError("unauthorized", safeProjectError("unauthorized"));

  const existing = await getProjectBySlug(ctx.activeWorkspace.workspace.id, slug);
  if (!existing)
    throw new ProjectServiceError("project_not_found", safeProjectError("project_not_found"));
  if (!canEditProject(existing.status as ProjectStatus)) {
    throw new ProjectServiceError("forbidden", "Archived projects cannot be edited.");
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.productDescription !== undefined)
    updateData.product_description = data.productDescription;
  if (data.websiteUrl !== undefined) updateData.website_url = data.websiteUrl || null;
  if (data.targetCustomerSummary !== undefined)
    updateData.target_customer_summary = data.targetCustomerSummary || null;
  if (data.businessModel !== undefined) updateData.business_model = data.businessModel || null;
  if (data.pricingSummary !== undefined) updateData.pricing_summary = data.pricingSummary || null;
  if (data.currentMarkets !== undefined) updateData.current_markets = data.currentMarkets;
  if (data.preferredLanguage !== undefined) updateData.preferred_language = data.preferredLanguage;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.additional_context !== undefined)
    updateData.additional_context = data.additional_context;

  try {
    return await updateProject(ctx.activeWorkspace.workspace.id, existing.id, updateData);
  } catch {
    throw new ProjectServiceError("persistence_failure", safeProjectError("persistence_failure"));
  }
}

export async function archiveProjectService(slug: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) throw new ProjectServiceError("unauthenticated", safeProjectError("unauthenticated"));
  if (!ctx.activeWorkspace)
    throw new ProjectServiceError("unauthorized", safeProjectError("unauthorized"));

  const existing = await getProjectBySlug(ctx.activeWorkspace.workspace.id, slug);
  if (!existing)
    throw new ProjectServiceError("project_not_found", safeProjectError("project_not_found"));

  await updateProject(ctx.activeWorkspace.workspace.id, existing.id, {
    status: "archived",
    archived_at: new Date().toISOString(),
  });
}

export async function restoreProjectService(slug: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) throw new ProjectServiceError("unauthenticated", safeProjectError("unauthenticated"));
  if (!ctx.activeWorkspace)
    throw new ProjectServiceError("unauthorized", safeProjectError("unauthorized"));

  const workspaceId = ctx.activeWorkspace.workspace.id;
  const existing = await getProjectBySlug(workspaceId, slug, true);
  if (!existing)
    throw new ProjectServiceError("project_not_found", safeProjectError("project_not_found"));

  const plan = getPlan("free")!; // Default to free plan for now
  try {
    await checkActiveProjectsAllowance(workspaceId, plan);
  } catch (err) {
    throw new ProjectServiceError(
      "plan_limit_reached",
      safeProjectError("plan_limit_reached", (err as Error).message),
    );
  }

  await updateProject(workspaceId, existing.id, {
    status: "active",
    archived_at: null,
  });
}

export async function deleteDraftProjectService(slug: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) throw new ProjectServiceError("unauthenticated", safeProjectError("unauthenticated"));
  if (!ctx.activeWorkspace)
    throw new ProjectServiceError("unauthorized", safeProjectError("unauthorized"));

  const existing = await getProjectBySlug(ctx.activeWorkspace.workspace.id, slug);
  if (!existing)
    throw new ProjectServiceError("project_not_found", safeProjectError("project_not_found"));
  if (!canDeleteProject(existing.status as ProjectStatus)) {
    throw new ProjectServiceError("forbidden", "Only draft projects may be deleted.");
  }

  await deleteProject(ctx.activeWorkspace.workspace.id, existing.id);
}

export async function listProjectsService(includeArchived = false): Promise<ProjectSummaryRow[]> {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  if (!ctx.activeWorkspace) return [];

  return listWorkspaceProjects(ctx.activeWorkspace.workspace.id, includeArchived);
}

export async function getProjectService(
  slug: string,
  includeArchived = false,
): Promise<ProjectRow | null> {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  if (!ctx.activeWorkspace) return null;

  return getProjectBySlug(ctx.activeWorkspace.workspace.id, slug, includeArchived);
}

export async function getProjectAnalysisService(
  projectId: string,
  workspaceId: string,
  limit = 10,
): Promise<{ latest: AnalysisRunRow | null; history: AnalysisRunRow[] }> {
  const [latest, history] = await Promise.all([
    getLatestAnalysisRun(projectId),
    listAnalysisRuns(workspaceId, projectId, limit),
  ]);
  return { latest, history };
}

export async function saveClarificationAnswersService(
  projectId: string,
  runId: string,
  answers: { questionKey: string; questionText: string; answer: string }[],
): Promise<ClarificationAnswerRow[]> {
  const ctx = await getAuthContext();
  if (!ctx) throw new ProjectServiceError("unauthenticated", safeProjectError("unauthenticated"));
  if (!ctx.activeWorkspace)
    throw new ProjectServiceError("unauthorized", safeProjectError("unauthorized"));

  const results: ClarificationAnswerRow[] = [];
  try {
    for (const item of answers) {
      if (!item.answer.trim()) continue;
      const row = await saveClarificationAnswer(
        ctx.activeWorkspace.workspace.id,
        projectId,
        runId,
        ctx.user.id,
        item.questionKey,
        item.questionText,
        item.answer,
      );
      results.push(row);
    }
    return results;
  } catch {
    throw new ProjectServiceError("persistence_failure", safeProjectError("persistence_failure"));
  }
}

export async function getClarificationAnswersService(
  projectId: string,
): Promise<ClarificationAnswerRow[]> {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  if (!ctx.activeWorkspace) return [];

  return getClarificationAnswers(ctx.activeWorkspace.workspace.id, projectId);
}
