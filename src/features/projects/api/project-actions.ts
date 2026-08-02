"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createProjectSchema, updateProjectSchema } from "../schema/project-schemas";
import {
  createProjectService,
  updateProjectService,
  archiveProjectService,
  restoreProjectService,
  deleteDraftProjectService,
  getProjectService,
  ProjectServiceError,
  saveClarificationAnswersService,
  getClarificationAnswersService,
} from "../services/project-service";
import {
  runProductAnalysis,
  retryFailedAnalysis,
  safeAnalysisError,
  AnalysisServiceError,
} from "../services/analysis-execution-service";
import { safeRateLimitMessage } from "@/lib/security/rate-limit-service";
import { getAuthContext } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { ACTIVE_PROJECT_COOKIE } from "../services/project-context-service";

export async function switchProjectAction(formData: FormData) {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  if (!projectSlug) return { error: "Missing project." };
  const project = await getProjectService(projectSlug);
  if (!project) return { error: "Project unavailable." };
  await setActiveProjectCookie(project.slug);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

async function setActiveProjectCookie(projectSlug: string) {
  try {
    (await cookies()).set(ACTIVE_PROJECT_COOKIE, projectSlug, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/dashboard",
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch (error) {
    if (process.env.APP_ENV === "test" && String(error).includes("outside a request scope")) return;
    throw error;
  }
}

export async function createProjectAction(formData: FormData) {
  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") || undefined,
    websiteUrl: formData.get("websiteUrl") || undefined,
    productDescription: formData.get("productDescription"),
    targetCustomerSummary: formData.get("targetCustomerSummary") || undefined,
    businessModel: formData.get("businessModel") || undefined,
    pricingSummary: formData.get("pricingSummary") || undefined,
    currentMarkets: parseCountryList(formData.get("currentMarkets"), []),
    targetExpansionMarkets: parseCountryList(formData.get("targetExpansionMarkets"), []),
    additionalContext: {
      priorityRegions: String(formData.get("priorityRegions") ?? "").trim() || undefined,
      countryDataCoverage: String(formData.get("countryDataCoverage") ?? "").trim() || undefined,
    },
    preferredLanguage: formData.get("preferredLanguage") || "en",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let project;
  try {
    project = await createProjectService(parsed.data);
  } catch (err) {
    const rateLimitMessage = safeRateLimitMessage(err);
    if (rateLimitMessage) return { error: rateLimitMessage };
    if (err instanceof ProjectServiceError) {
      return { error: err.message };
    }
    return { error: "Could not create project. Try again." };
  }
  await setActiveProjectCookie(project.slug);
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/markets");
  revalidatePath("/dashboard", "layout");
  return project;
}

export async function updateProjectAction(formData: FormData) {
  const slug = formData.get("slug") as string;
  if (!slug) return { error: "Missing project slug." };

  const parsed = updateProjectSchema.safeParse({
    name: formData.get("name") || undefined,
    productDescription: formData.get("productDescription") || undefined,
    websiteUrl: formData.get("websiteUrl") || undefined,
    targetCustomerSummary: formData.get("targetCustomerSummary") || undefined,
    businessModel: formData.get("businessModel") || undefined,
    pricingSummary: formData.get("pricingSummary") || undefined,
    currentMarkets: parseCountryList(formData.get("currentMarkets"), undefined),
    targetExpansionMarkets: parseCountryList(formData.get("targetExpansionMarkets"), undefined),
    additionalContext: {
      ...((await getProjectService(slug))?.additional_context ?? {}),
      priorityRegions: String(formData.get("priorityRegions") ?? "").trim() || undefined,
      countryDataCoverage: String(formData.get("countryDataCoverage") ?? "").trim() || undefined,
    },
    preferredLanguage: formData.get("preferredLanguage") || undefined,
    status: formData.get("status") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await updateProjectService(slug, parsed.data);
  } catch (err) {
    if (err instanceof ProjectServiceError) {
      return { error: err.message };
    }
    return { error: "Could not update project. Try again." };
  }
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${slug}`);
  revalidatePath(`/dashboard/projects/${slug}/markets`);
  revalidatePath("/dashboard/markets");
  revalidatePath("/dashboard", "layout");
}

function parseCountryList(value: FormDataEntryValue | null, missing: unknown): unknown {
  if (typeof value !== "string" || !value) return missing;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export async function archiveProjectAction(slug: string) {
  try {
    await archiveProjectService(slug);
  } catch (err) {
    if (err instanceof ProjectServiceError) {
      return { error: err.message };
    }
    return { error: "Could not archive project." };
  }
  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects");
}

export async function restoreProjectAction(slug: string) {
  try {
    await restoreProjectService(slug);
  } catch (err) {
    if (err instanceof ProjectServiceError) {
      return { error: err.message };
    }
    return { error: "Could not restore project." };
  }
  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects");
}

export async function deleteDraftProjectAction(slug: string) {
  try {
    await deleteDraftProjectService(slug);
  } catch (err) {
    if (err instanceof ProjectServiceError) {
      return { error: err.message };
    }
    return { error: "Could not delete project." };
  }
  revalidatePath("/dashboard/projects");
  redirect("/dashboard/projects");
}

export async function runAnalysisAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Sign in to run analysis." };
  if (!ctx.activeWorkspace) return { error: "Create a workspace first." };

  const projectSlug = formData.get("projectSlug") as string;
  if (!projectSlug) return { error: "Missing project slug." };

  const project = await getProjectService(projectSlug);
  if (!project) return { error: "Project not found." };

  const input = {
    productName: project.name,
    productDescription: project.product_description,
    websiteUrl: project.website_url ?? undefined,
    targetCustomerSummary: project.target_customer_summary ?? undefined,
    businessModel: project.business_model ?? undefined,
    pricingSummary: project.pricing_summary ?? undefined,
    currentMarkets: project.current_markets ?? [],
    preferredLanguage: project.preferred_language,
    additionalContext: (project.additional_context as Record<string, string> | null) ?? undefined,
  };

  try {
    const answers = await getClarificationAnswersService(project.id);
    const answersRecord: Record<string, string> = {};
    for (const ans of answers) {
      answersRecord[ans.question_key] = ans.answer;
    }

    const finalInput = {
      ...input,
      clarificationAnswers: Object.keys(answersRecord).length > 0 ? answersRecord : undefined,
    };

    const { runId } = await runProductAnalysis(
      {
        workspaceId: ctx.activeWorkspace.workspace.id,
        projectSlug,
        userId: ctx.user.id,
        projectId: project.id,
      },
      finalInput,
    );
    revalidatePath(`/dashboard/projects/${projectSlug}`);
    return { ok: true, runId };
  } catch (err) {
    const rateLimitMessage = safeRateLimitMessage(err);
    if (rateLimitMessage) return { error: rateLimitMessage };
    if (err instanceof AnalysisServiceError) {
      return {
        error: safeAnalysisError(err.code),
        errorReference: err.reference,
        operationId: err.operationId,
      };
    }
    return { error: "Analysis failed. Try again." };
  }
}

export async function retryAnalysisAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Sign in to retry analysis." };
  if (!ctx.activeWorkspace) return { error: "Create a workspace first." };

  const projectSlug = formData.get("projectSlug") as string;
  const previousRunId = formData.get("previousRunId") as string;
  if (!projectSlug || !previousRunId) return { error: "Missing parameters." };

  const project = await getProjectService(projectSlug);
  if (!project) return { error: "Project not found." };

  try {
    const { runId } = await retryFailedAnalysis(
      {
        workspaceId: ctx.activeWorkspace.workspace.id,
        projectSlug,
        userId: ctx.user.id,
        projectId: project.id,
      },
      previousRunId,
    );
    revalidatePath(`/dashboard/projects/${projectSlug}`);
    return { ok: true, runId };
  } catch (err) {
    const rateLimitMessage = safeRateLimitMessage(err);
    if (rateLimitMessage) return { error: rateLimitMessage };
    if (err instanceof AnalysisServiceError) {
      return {
        error: safeAnalysisError(err.code),
        errorReference: err.reference,
        operationId: err.operationId,
      };
    }
    return { error: "Retry failed. Try again." };
  }
}

export async function saveProjectContextAndAnswersAction(
  slug: string,
  runId: string | null,
  data: {
    additionalContext: Record<string, unknown>;
    clarificationAnswers: { questionKey: string; questionText: string; answer: string }[];
  },
) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Sign in to save context." };
  if (!ctx.activeWorkspace) return { error: "Workspace required." };

  const project = await getProjectService(slug);
  if (!project) return { error: "Project not found." };

  try {
    if (Object.keys(data.additionalContext).length > 0) {
      await updateProjectService(slug, {
        additional_context: data.additionalContext,
      });
    }

    if (data.clarificationAnswers.length > 0 && runId) {
      await saveClarificationAnswersService(project.id, runId, data.clarificationAnswers);
    }
  } catch (err) {
    if (err instanceof ProjectServiceError) {
      return { error: err.message };
    }
    return { error: "Could not save context and answers." };
  }

  revalidatePath(`/dashboard/projects/${slug}`);
  return { ok: true };
}
export async function getAnalysisRunStatusAction(runId: string) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.activeWorkspace) return null;
  const mod = await import("@/features/projects/repository/project-repository");
  const run = await mod.getAnalysisRun(ctx.activeWorkspace.workspace.id, runId);
  return run ? { status: run.status, current_stage: run.current_stage } : null;
}
