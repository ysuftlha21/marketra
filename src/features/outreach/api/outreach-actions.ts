"use server";

import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { OutreachRequestSchema } from "@/lib/providers/outreach/outreach.provider";
import { resolveWorkspacePlan } from "@/features/workspaces/services/workspace-plan-service";
import { getWorkspaceUsage } from "@/features/workspaces/services/workspace-usage-service";
import { startOutreachGeneration } from "../services/outreach-execution-service";
import { OutreachError, safeOutreachError } from "../domain/outreach-errors";
import {
  getOutreachRun,
  getOutreachDraft,
  getOutreachDraftByRun,
} from "../repository/outreach-repository";

const generateOutreachActionSchema = OutreachRequestSchema.extend({
  projectSlug: z.string().trim().min(1).max(200),
  countryId: z.string().uuid(),
  companyId: z.string().uuid(),
  decisionRoleId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
});

export async function generateOutreachAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const parsed = generateOutreachActionSchema.safeParse({
    projectSlug: formData.get("projectSlug"),
    countryId: formData.get("countryId"),
    companyId: formData.get("companyId"),
    decisionRoleId: formData.get("decisionRoleId"),
    channel: formData.get("channel"),
    messageType: formData.get("messageType"),
    language: formData.get("language"),
    objective: formData.get("objective"),
    tone: formData.get("tone") || "professional",
    length: formData.get("length") || "medium",
    optionalUserInstructions: formData.get("instructions") || undefined,
    idempotencyKey: formData.get("idempotencyKey") || undefined,
  });

  if (!parsed.success) return { error: safeOutreachError("invalid_request") };

  try {
    const request = parsed.data;
    const { runId } = await startOutreachGeneration(
      ctx.activeWorkspace.workspace.id,
      request.projectSlug,
      request.countryId,
      request.companyId,
      request.decisionRoleId,
      ctx.user.id,
      {
        channel: request.channel,
        messageType: request.messageType,
        language: request.language,
        objective: request.objective,
        tone: request.tone,
        length: request.length,
        optionalUserInstructions: request.optionalUserInstructions,
      },
      request.idempotencyKey,
    );
    return { success: true, runId };
  } catch (error: unknown) {
    if (error instanceof OutreachError) {
      return { error: safeOutreachError(error.code) };
    }
    return { error: safeOutreachError("persistence_failure") };
  }
}

export async function getOutreachRunStatusAction(
  _projectSlug: string,
  _countryCode: string,
  _companyId: string,
  runId: string,
) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const run = await getOutreachRun(ctx.activeWorkspace.workspace.id, runId);
  if (!run) return { error: "Run not found." };

  const result: Record<string, unknown> = {
    status: run.status,
    currentStage: run.current_stage,
    safeErrorMessage: run.safe_error_message ?? null,
  };

  if (run.status === "succeeded") {
    const linked = await getOutreachDraftByRun(ctx.activeWorkspace.workspace.id, runId);
    if (linked) result.draftId = linked.id;
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
    const snapshot = run.result_snapshot as Record<string, unknown>;
    if (typeof snapshot.confidence === "number") view.confidence = snapshot.confidence;
    if (snapshot.personalizationSummary && typeof snapshot.personalizationSummary === "object") {
      view.personalizationSummary = snapshot.personalizationSummary as Record<string, unknown>;
    }
    if (Array.isArray(snapshot.evidenceUsed)) view.evidenceUsed = snapshot.evidenceUsed;
    if (Array.isArray(snapshot.assumptions)) view.assumptions = snapshot.assumptions;
    if (Array.isArray(snapshot.warnings)) view.warnings = snapshot.warnings;
    if (Array.isArray(snapshot.missingInformation)) {
      view.missingInformation = snapshot.missingInformation;
    }
  }

  return { success: true, draft: view };
}

export async function getOutreachUsageAction() {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { error: "Sign in." };

  const workspaceId = ctx.activeWorkspace.workspace.id;
  const [usage, planResolution] = await Promise.all([
    getWorkspaceUsage(workspaceId),
    resolveWorkspacePlan(workspaceId),
  ]);
  const { plan } = planResolution;

  return {
    used: usage.outreachGenerationsUsed,
    limit: plan.outreachGenerationsPerPeriod,
    remaining: Math.max(0, plan.outreachGenerationsPerPeriod - usage.outreachGenerationsUsed),
  };
}
