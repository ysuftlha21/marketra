import { z } from "zod";

export const workspaceRoleSchema = z.enum(["owner", "admin", "member"]);
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

export const WORKSPACE_ROLES = ["owner", "admin", "member"] as const;

export function isOwner(role: WorkspaceRole | string | null | undefined): boolean {
  return role === "owner";
}

export function isAdmin(role: WorkspaceRole | string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function isMember(role: WorkspaceRole | string | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

export function canManageMembers(role: WorkspaceRole | string | null | undefined): boolean {
  return isAdmin(role);
}

export function canManageWorkspaceSettings(
  role: WorkspaceRole | string | null | undefined,
): boolean {
  return isAdmin(role);
}

export function canDeleteWorkspace(role: WorkspaceRole | string | null | undefined): boolean {
  return role === "owner";
}

export function canTransferOwnership(role: WorkspaceRole | string | null | undefined): boolean {
  return role === "owner";
}

export function canLeaveWorkspace(role: WorkspaceRole | string | null | undefined): boolean {
  return role !== "owner";
}
