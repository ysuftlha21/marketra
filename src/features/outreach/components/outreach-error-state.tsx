"use client";

import { AlertTriangle } from "lucide-react";

interface OutreachErrorStateProps {
  message: string;
}

export function OutreachErrorState({ message }: OutreachErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 p-4"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <p className="text-sm text-danger">{message}</p>
    </div>
  );
}
