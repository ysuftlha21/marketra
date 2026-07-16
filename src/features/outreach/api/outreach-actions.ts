"use server";

import { getAuthContext } from "@/lib/auth/session";
import {
  startOutreachGeneration,
  OutreachError,
  safeOutreachError,
} from "../services/outreach-execution-service";
import {
  getOutreachRun,
  getOutreachDraft,
  listCompanyOutreachDrafts,
} from "../repository/outreach-repository";

export async function generateOutreachAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const projectSlug = formData.get("projectSlug") as string;
  const countryId = formData.get("countryId") as string;
  const companyId = formData.get("companyId") as string;
  const decisionRoleId = formData.get("decisionRoleId") as string;
  const channel = formData.get("channel") as string;
  const messageType = formData.get("messageType") as string;
  const language = formData.get("language") as string;
  const objective = formData.get("objective") as string;
  const tone = (formData.get("tone") as string) || "professional";
  const length = (formData.get("length") as string) || "medium";
  const instructions = (formData.get("instructions") as string) || undefined;
  const idempotencyKey = formData.get("idempotencyKey") as string;

  if (
    !projectSlug ||
    !countryId ||
    !companyId ||
    !decisionRoleId ||
    !channel ||
    !messageType ||
    !language ||
    !objective
  ) {
    return { error: "Missing required parameters." };
  }

  try {
    const { runId } = await startOutreachGeneration(
      ctx.activeWorkspace.workspace.id,
      projectSlug,
      countryId,
      companyId,
      decisionRoleId,
      ctx.user.id,
      channel,
      messageType,
      language,
      objective,
      tone,
      length,
      instructions,
      idempotencyKey || undefined,
    );

    return { success: true, runId };
  } catch (e: unknown) {
    if (e instanceof OutreachError) {
      return { error: safeOutreachError(e.code) };
    }
    return { error: "Failed to generate outreach." };
  }
}

export async function getOutreachRunStatusAction(
  _projectSlug: string,
  _countryCode: string,
  companyId: string,
  runId: string,
) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const run = await getOutreachRun(ctx.activeWorkspace.workspace.id, runId);
  if (!run) return { error: "Run not found." };

  if (run.workspace_id !== ctx.activeWorkspace.workspace.id) {
    return { error: "Access denied." };
  }

  const result: Record<string, unknown> = {
    status: run.status,
    currentStage: run.current_stage,
    safeErrorMessage: run.safe_error_message ?? null,
  };

  if (run.status === "succeeded") {
    const drafts = await listCompanyOutreachDrafts(ctx.activeWorkspace.workspace.id, companyId);
    const linked = drafts.find((d) => d.source_run_id === runId);
    if (linked) {
      result.draftId = linked.id;
    }
  }

  return result;
}

export async function getOutreachDraftViewAction(draftId: string) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const draft = await getOutreachDraft(ctx.activeWorkspace.workspace.id, draftId);
  if (!draft) return { error: "Draft not found." };

  const run = await getOutreachRun(ctx.activeWorkspace.workspace.id, draft.source_run_id);

  const view: Record<string, unknown> = {
    id: draft.id,
    channel: draft.channel,
    messageType: draft.message_type,
    language: draft.language,
    subject: draft.subject,
    body: draft.body,
    callToAction: draft.call_to_action,
    tone: draft.tone,
    length: draft.length,
    status: draft.status,
    confidence: null as number | null,
    personalizationSummary: null as Record<string, unknown> | null,
    evidenceUsed: [] as string[],
    assumptions: [] as string[],
    warnings: [] as string[],
    missingInformation: [] as string[],
  };

  if (run?.result_snapshot && typeof run.result_snapshot === "object") {
    const snap = run.result_snapshot as Record<string, unknown>;
    if (typeof snap.confidence === "number") view.confidence = snap.confidence;
    if (snap.personalizationSummary && typeof snap.personalizationSummary === "object") {
      view.personalizationSummary = snap.personalizationSummary as Record<string, unknown>;
    }
    if (Array.isArray(snap.evidenceUsed)) view.evidenceUsed = snap.evidenceUsed as string[];
    if (Array.isArray(snap.assumptions)) view.assumptions = snap.assumptions as string[];
    if (Array.isArray(snap.warnings)) view.warnings = snap.warnings as string[];
    if (Array.isArray(snap.missingInformation))
      view.missingInformation = snap.missingInformation as string[];
  }

  return { success: true, draft: view };
}

export async function getOutreachUsageAction() {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const { getWorkspaceUsage } =
    await import("@/features/workspaces/services/workspace-usage-service");
  const { getPlan } = await import("@/config/plans");
  const usage = await getWorkspaceUsage(ctx.activeWorkspace.workspace.id);
  const plan = getPlan("free")!;

  return {
    used: usage.outreachGenerationsUsed,
    limit: plan.outreachGenerationsPerPeriod,
    remaining: Math.max(0, plan.outreachGenerationsPerPeriod - usage.outreachGenerationsUsed),
  };
}
