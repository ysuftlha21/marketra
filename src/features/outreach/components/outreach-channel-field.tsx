"use client";

import { Label } from "@/components/ui/label";
import { OUTREACH_CHANNELS } from "./outreach-types";

interface OutreachChannelFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function OutreachChannelField({ value, onChange }: OutreachChannelFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="og-channel">Channel</Label>
      <select
        id="og-channel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {OUTREACH_CHANNELS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
