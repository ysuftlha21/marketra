"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/session";
import {
  startDecisionRoleGeneration,
  retryDecisionRoleGeneration,
  DecisionRoleError,
  safeDecisionRoleError,
} from "../services/decision-role-execution-service";
import {
  updateCompanyDecisionRole,
  insertDecisionRoleFeedback,
  unsetPrimaryRole,
  unsetSecondaryRole,
  createCompanyDecisionRole,
} from "../repository/decision-role-repository";
import {
  editDecisionRoleSchema,
  addManualDecisionRoleSchema,
} from "../schema/decision-role.schema";
import { safeRateLimitMessage } from "@/lib/security/rate-limit-service";

export async function startDecisionRoleGenerationAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  const companyId = formData.get("companyId") as string;

  if (!projectSlug || !countryId || !companyId) return { error: "Missing parameters." };

  try {
    await startDecisionRoleGeneration(
      ctx.activeWorkspace.workspace.id,
      projectSlug,
      countryId,
      companyId,
      ctx.user.id,
    );
    revalidatePath(
      `/${ctx.activeWorkspace.workspace.slug}/projects/${projectSlug}/companies/${companyId}`,
    );
    return { success: true };
  } catch (e: unknown) {
    const rateLimitMessage = safeRateLimitMessage(e);
    if (rateLimitMessage) return { error: rateLimitMessage };
    if (e instanceof DecisionRoleError) {
      return { error: safeDecisionRoleError(e.code) };
    }
    return { error: "Failed to start generation." };
  }
}

export async function retryDecisionRoleGenerationAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  const companyId = formData.get("companyId") as string;
  const runId = formData.get("runId") as string;

  if (!projectSlug || !countryId || !companyId || !runId) return { error: "Missing parameters." };

  try {
    await retryDecisionRoleGeneration(
      ctx.activeWorkspace.workspace.id,
      projectSlug,
      countryId,
      runId,
      ctx.user.id,
    );
    revalidatePath(
      `/${ctx.activeWorkspace.workspace.slug}/projects/${projectSlug}/companies/${companyId}`,
    );
    return { success: true };
  } catch (e: unknown) {
    const rateLimitMessage = safeRateLimitMessage(e);
    if (rateLimitMessage) return { error: rateLimitMessage };
    if (e instanceof DecisionRoleError) {
      return { error: safeDecisionRoleError(e.code) };
    }
    return { error: "Failed to retry generation." };
  }
}

export async function updateDecisionRoleStatusAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const roleId = formData.get("roleId") as string;
  const companyId = formData.get("companyId") as string;
  const projectId = formData.get("projectId") as string;
  const projectSlug = formData.get("projectSlug") as string;
  const status = formData.get("status") as "suggested" | "approved" | "rejected" | "archived";

  if (!roleId || !status || !companyId || !projectId) return { error: "Missing parameters." };

  try {
    const nextStatus = status;

    await updateCompanyDecisionRole(ctx.activeWorkspace.workspace.id, roleId, {
      status: nextStatus,
    });

    await insertDecisionRoleFeedback(ctx.activeWorkspace.workspace.id, {
      workspace_id: ctx.activeWorkspace.workspace.id,
      project_id: projectId,
      company_id: companyId,
      decision_role_id: roleId,
      action: nextStatus, // mapped cleanly enough
      created_by: ctx.user.id,
    });

    revalidatePath(
      `/${ctx.activeWorkspace.workspace.slug}/projects/${projectSlug}/companies/${companyId}`,
    );
    return { success: true };
  } catch (e: unknown) {
    console.error("Update Role Status Error:", e);
    return { error: "Failed to update role." };
  }
}

export async function setPrimaryRoleAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const roleId = formData.get("roleId") as string;
  const companyId = formData.get("companyId") as string;
  const projectId = formData.get("projectId") as string;
  const projectSlug = formData.get("projectSlug") as string;
  const value = formData.get("value") === "true";

  if (!roleId || !companyId || !projectId) return { error: "Missing parameters." };

  try {
    if (value) {
      await unsetPrimaryRole(ctx.activeWorkspace.workspace.id, projectId, companyId);
    }

    await updateCompanyDecisionRole(ctx.activeWorkspace.workspace.id, roleId, {
      is_primary: value,
    });

    await insertDecisionRoleFeedback(ctx.activeWorkspace.workspace.id, {
      workspace_id: ctx.activeWorkspace.workspace.id,
      project_id: projectId,
      company_id: companyId,
      decision_role_id: roleId,
      action: value ? "set_primary" : "unset_primary",
      created_by: ctx.user.id,
    });

    revalidatePath(
      `/${ctx.activeWorkspace.workspace.slug}/projects/${projectSlug}/companies/${companyId}`,
    );
    return { success: true };
  } catch (e: unknown) {
    console.error("Set Primary Role Error:", e);
    return { error: "Failed to update primary role." };
  }
}

export async function setSecondaryRoleAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const roleId = formData.get("roleId") as string;
  const companyId = formData.get("companyId") as string;
  const projectId = formData.get("projectId") as string;
  const projectSlug = formData.get("projectSlug") as string;
  const value = formData.get("value") === "true";

  if (!roleId || !companyId || !projectId) return { error: "Missing parameters." };

  try {
    if (value) {
      await unsetSecondaryRole(ctx.activeWorkspace.workspace.id, projectId, companyId);
    }

    await updateCompanyDecisionRole(ctx.activeWorkspace.workspace.id, roleId, {
      is_secondary: value,
    });

    await insertDecisionRoleFeedback(ctx.activeWorkspace.workspace.id, {
      workspace_id: ctx.activeWorkspace.workspace.id,
      project_id: projectId,
      company_id: companyId,
      decision_role_id: roleId,
      action: value ? "set_secondary" : "unset_secondary",
      created_by: ctx.user.id,
    });

    revalidatePath(
      `/${ctx.activeWorkspace.workspace.slug}/projects/${projectSlug}/companies/${companyId}`,
    );
    return { success: true };
  } catch (e: unknown) {
    console.error("Set Secondary Role Error:", e);
    return { error: "Failed to update secondary role." };
  }
}

export async function editDecisionRoleAction(payload: unknown) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  try {
    const parsed = editDecisionRoleSchema.parse(payload);

    await updateCompanyDecisionRole(ctx.activeWorkspace.workspace.id, parsed.roleId, {
      role_title: parsed.role_title,
      role_family: parsed.role_family,
      department: parsed.department,
      buying_role: parsed.buying_role,
      reasoning: parsed.reasoning,
      likely_pain_points: parsed.likely_pain_points,
      likely_objections: parsed.likely_objections,
      recommended_message_angles: parsed.recommended_message_angles,
      user_notes: parsed.user_notes || null,
    });

    await insertDecisionRoleFeedback(ctx.activeWorkspace.workspace.id, {
      workspace_id: ctx.activeWorkspace.workspace.id,
      project_id: parsed.projectId,
      company_id: parsed.companyId,
      decision_role_id: parsed.roleId,
      action: "edited",
      created_by: ctx.user.id,
    });

    revalidatePath(
      `/${ctx.activeWorkspace.workspace.slug}/projects/${parsed.projectSlug}/companies/${parsed.companyId}`,
    );
    return { success: true };
  } catch (e: unknown) {
    console.error("Edit Decision Role Error:", e);
    return { error: "Failed to edit role details." };
  }
}

export async function addManualDecisionRoleAction(payload: unknown) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  try {
    const parsed = addManualDecisionRoleSchema.parse(payload);

    // If no sourceRunId provided, we could optionally lookup the latest run. But the schema requires it now.
    // Ensure the run exists.

    const role = await createCompanyDecisionRole(ctx.activeWorkspace.workspace.id, {
      workspace_id: ctx.activeWorkspace.workspace.id,
      project_id: parsed.projectId,
      company_id: parsed.companyId,
      source_run_id: parsed.sourceRunId,
      source_type: "manual",
      status: "approved",
      role_key: parsed.role_title.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      role_title: parsed.role_title,
      role_family: parsed.role_family,
      department: parsed.department,
      buying_role: parsed.buying_role,
      reasoning: parsed.reasoning,
      likely_pain_points: parsed.likely_pain_points,
      likely_objections: parsed.likely_objections,
      recommended_message_angles: parsed.recommended_message_angles,
      title_variants: [],
      seniority_levels: [],
      company_size_relevance: "High",
      country_relevance: "High",
      fit_score: 100,
      confidence_score: 100,
      user_notes: parsed.user_notes || null,
    });

    await insertDecisionRoleFeedback(ctx.activeWorkspace.workspace.id, {
      workspace_id: ctx.activeWorkspace.workspace.id,
      project_id: parsed.projectId,
      company_id: parsed.companyId,
      decision_role_id: role.id,
      action: "manually_created",
      created_by: ctx.user.id,
    });

    revalidatePath(
      `/${ctx.activeWorkspace.workspace.slug}/projects/${parsed.projectSlug}/companies/${parsed.companyId}`,
    );
    return { success: true };
  } catch (e: unknown) {
    console.error("Add Manual Role Error:", e);
    return { error: "Failed to add manual role." };
  }
}
