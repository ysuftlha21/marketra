"use client";

import { useFormStatus } from "react-dom";
import { Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DiscoverySubmitButton({
  label = "Run discovery",
  disabled = false,
}: {
  label?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} aria-disabled={disabled || pending}>
      {pending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      {pending ? "Starting discovery…" : label}
    </Button>
  );
}
