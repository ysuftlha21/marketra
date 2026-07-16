"use client";

import * as React from "react";
import {
  updateMemberRoleAction,
  leaveWorkspaceAction,
} from "@/features/workspaces/api/workspace-actions";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceRole } from "@/features/workspaces/domain/roles";

export interface MemberRow {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: WorkspaceRole;
  isSelf: boolean;
}

export function MembersList({
  members,
  canManage,
  currentUserId,
}: {
  members: MemberRow[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onRoleChange(userId: string, role: string) {
    setError(null);
    setPendingId(userId);
    try {
      const formData = new FormData();
      formData.set("userId", userId);
      formData.set("role", role);
      const res = await updateMemberRoleAction(formData);
      if (res?.error) setError(res.error);
    } finally {
      setPendingId(null);
    }
  }

  async function onLeave() {
    setError(null);
    setPendingId("leave");
    try {
      const res = await leaveWorkspaceAction();
      if (res?.error) setError(res.error);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-lg border border-border">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {m.displayName || "Member"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.email || "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              {m.isSelf && (
                <Badge variant="outline" tone="neutral">
                  You
                </Badge>
              )}
              {m.role === "owner" ? (
                <Badge variant="outline" tone="primary">
                  Owner
                </Badge>
              ) : canManage ? (
                <select
                  aria-label={`Role for ${m.displayName ?? m.email ?? "member"}`}
                  value={m.role}
                  disabled={pendingId === m.userId}
                  onChange={(e) => onRoleChange(m.userId, e.target.value)}
                  className="h-8 rounded-md border border-input bg-surface px-2 text-sm text-foreground"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              ) : (
                <Badge variant="outline" tone={m.role === "admin" ? "accent" : "neutral"}>
                  {m.role === "admin" ? "Admin" : "Member"}
                </Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onLeave}
        disabled={
          pendingId === "leave" || members.find((m) => m.userId === currentUserId)?.role === "owner"
        }
        className="text-sm text-muted-foreground hover:text-danger"
      >
        Leave workspace
      </button>
    </div>
  );
}
