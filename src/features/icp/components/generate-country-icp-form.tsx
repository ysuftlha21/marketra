"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { generateCountryIcpFormAction } from "../api/icp-actions";

export function GenerateCountryIcpForm(props: {
  projectSlug: string;
  countryId: string;
  countryCode: string;
}) {
  const [state, action, pending] = useActionState(generateCountryIcpFormAction, null);
  return (
    <form action={action} className="space-y-2" aria-busy={pending}>
      <input type="hidden" name="projectSlug" value={props.projectSlug} />
      <input type="hidden" name="countryId" value={props.countryId} />
      <input type="hidden" name="countryCode" value={props.countryCode} />
      <Button type="submit" disabled={pending} aria-disabled={pending}>
        <Play className="h-4 w-4" />
        {pending ? "Creating ICP…" : "Generate ICP with AI"}
      </Button>
      <p
        role="status"
        aria-live="polite"
        className={
          state?.status === "success" ? "text-sm text-success" : "text-sm text-destructive"
        }
      >
        {state
          ? `${state.message}${state.status !== "success" && state.reference ? ` Reference: ${state.reference} · Operation ID: ${state.operationId}` : ""}`
          : null}
      </p>
    </form>
  );
}
