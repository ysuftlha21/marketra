"use client";

import { Label } from "@/components/ui/label";
import { OUTREACH_MESSAGE_TYPES } from "./outreach-types";

interface OutreachMessageTypeFieldProps {
  value: string;
  onChange: (value: string) => void;
  validTypes: string[];
}

export function OutreachMessageTypeField({
  value,
  onChange,
  validTypes,
}: OutreachMessageTypeFieldProps) {
  const options = OUTREACH_MESSAGE_TYPES.filter((m) => validTypes.includes(m.value));

  return (
    <div className="space-y-1.5">
      <Label htmlFor="og-msg-type">Message Type</Label>
      <select
        id="og-msg-type"
        value={options.some((o) => o.value === value) ? value : (options[0]?.value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
