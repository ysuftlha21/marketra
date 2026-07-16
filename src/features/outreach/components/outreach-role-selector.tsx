"use client";

import { Star } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { ApprovedRoleOption } from "./outreach-types";

interface OutreachRoleSelectorProps {
  roles: ApprovedRoleOption[];
  selectedRole: ApprovedRoleOption | null;
  onChange: (role: ApprovedRoleOption) => void;
}

export function OutreachRoleSelector({ roles, selectedRole, onChange }: OutreachRoleSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="og-role">Decision Maker Role *</Label>
      <select
        id="og-role"
        value={selectedRole?.id ?? ""}
        onChange={(e) => {
          const role = roles.find((r) => r.id === e.target.value);
          if (role) onChange(role);
        }}
        className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="" disabled>
          Select a role…
        </option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title} — {r.buyingRole.replace("_", " ")} ({r.department})
            {r.isPrimary ? " ★ Primary" : r.isSecondary ? " ☆ Secondary" : ""}
          </option>
        ))}
      </select>
      {selectedRole && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            Fit: <span className="font-medium text-foreground">{selectedRole.fitScore}</span>
          </span>
          <span>Priority: {selectedRole.priority}</span>
          {selectedRole.isPrimary && (
            <span className="inline-flex items-center gap-1 text-primary">
              <Star className="h-3 w-3" /> Primary
            </span>
          )}
          {selectedRole.isSecondary && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3" /> Secondary
            </span>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        These are recommended role targets based on available company and ICP context. They do not
        confirm that a specific employee or title exists.
      </p>
    </div>
  );
}
