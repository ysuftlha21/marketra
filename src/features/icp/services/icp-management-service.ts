import { getAuthContext } from "@/lib/auth/session";
import { getIcpProfile, updateIcpProfile } from "../repository/icp-repository";
import {
  canEdit,
  canApprove,
  canReject,
  canRestore,
  canArchive,
  type IcpProfileStatus,
} from "../domain/icp-status";
import type { IcpEditInput } from "../schema/icp-schemas";

export type IcpServiceErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "icp_not_found"
  | "invalid_transition"
  | "persistence_failure";
export class IcpServiceError extends Error {
  readonly code: IcpServiceErrorCode;
  constructor(c: IcpServiceErrorCode, m: string) {
    super(m);
    this.name = "IcpServiceError";
    this.code = c;
  }
}

function safeErr(c: IcpServiceErrorCode): string {
  const m: Record<IcpServiceErrorCode, string> = {
    unauthenticated: "Sign in.",
    unauthorized: "No permission.",
    icp_not_found: "ICP not found.",
    invalid_transition: "Invalid status change.",
    persistence_failure: "Save failed.",
  };
  return m[c];
}

export async function updateIcpDraft(icpId: string, data: IcpEditInput): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace)
    throw new IcpServiceError("unauthenticated", safeErr("unauthenticated"));
  const wsId = ctx.activeWorkspace.workspace.id;
  const icp = await getIcpProfile(wsId, icpId);
  if (!icp) throw new IcpServiceError("icp_not_found", safeErr("icp_not_found"));
  if (!canEdit(icp.status as IcpProfileStatus))
    throw new IcpServiceError("invalid_transition", safeErr("invalid_transition"));

  const updates: Record<string, unknown> = { user_edits: data };
  if (data.name) updates.name = data.name;
  if (data.summary) updates.summary = data.summary;
  if (data.industrySegments) updates.industry_segments = data.industrySegments;
  if (data.companyAttributes) updates.company_attributes = data.companyAttributes;
  if (data.buyerRoles) updates.buyer_roles = data.buyerRoles;
  if (data.assumptions) updates.assumptions = data.assumptions;
  if (data.missingInformation) updates.missing_information = data.missingInformation;
  if (data.validationQuestions) updates.validation_questions = data.validationQuestions;
  await updateIcpProfile(wsId, icpId, updates);
}

export async function approveIcp(icpId: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace)
    throw new IcpServiceError("unauthenticated", safeErr("unauthenticated"));
  const wsId = ctx.activeWorkspace.workspace.id;
  const icp = await getIcpProfile(wsId, icpId);
  if (!icp) throw new IcpServiceError("icp_not_found", safeErr("icp_not_found"));
  if (!canApprove(icp.status as IcpProfileStatus))
    throw new IcpServiceError("invalid_transition", safeErr("invalid_transition"));
  await updateIcpProfile(wsId, icpId, {
    status: "approved",
    approved_by: ctx.user.id,
    approved_at: new Date().toISOString(),
  });
}

export async function rejectIcp(icpId: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace)
    throw new IcpServiceError("unauthenticated", safeErr("unauthenticated"));
  const wsId = ctx.activeWorkspace.workspace.id;
  const icp = await getIcpProfile(wsId, icpId);
  if (!icp) throw new IcpServiceError("icp_not_found", safeErr("icp_not_found"));
  if (!canReject(icp.status as IcpProfileStatus))
    throw new IcpServiceError("invalid_transition", safeErr("invalid_transition"));
  await updateIcpProfile(wsId, icpId, {
    status: "rejected",
    rejected_by: ctx.user.id,
    rejected_at: new Date().toISOString(),
  });
}

export async function restoreIcpToDraft(icpId: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace)
    throw new IcpServiceError("unauthenticated", safeErr("unauthenticated"));
  const wsId = ctx.activeWorkspace.workspace.id;
  const icp = await getIcpProfile(wsId, icpId);
  if (!icp) throw new IcpServiceError("icp_not_found", safeErr("icp_not_found"));
  if (!canRestore(icp.status as IcpProfileStatus))
    throw new IcpServiceError("invalid_transition", safeErr("invalid_transition"));
  await updateIcpProfile(wsId, icpId, { status: "draft", rejected_by: null, rejected_at: null });
}

export async function archiveIcp(icpId: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace)
    throw new IcpServiceError("unauthenticated", safeErr("unauthenticated"));
  const wsId = ctx.activeWorkspace.workspace.id;
  const icp = await getIcpProfile(wsId, icpId);
  if (!icp) throw new IcpServiceError("icp_not_found", safeErr("icp_not_found"));
  if (!canArchive(icp.status as IcpProfileStatus))
    throw new IcpServiceError("invalid_transition", safeErr("invalid_transition"));
  await updateIcpProfile(wsId, icpId, {
    status: "archived",
    archived_at: new Date().toISOString(),
  });
}
