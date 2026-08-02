"use client";

import { useActionState } from "react";
import { Play, RotateCcw } from "lucide-react";
import {
  runMarketAnalysisFormAction,
  type RunMarketAnalysisActionState,
} from "../api/market-actions";
import { Button } from "@/components/ui/button";

export function RunMarketAnalysisForm({
  projectSlug,
  countryId,
  mode = "analyze",
  disabled = false,
}: {
  projectSlug: string;
  countryId: string;
  mode?: "analyze" | "retry";
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState<RunMarketAnalysisActionState | null, FormData>(
    runMarketAnalysisFormAction,
    null,
  );
  const unavailable = pending || disabled;

  return (
    <form action={action} aria-busy={pending} className="space-y-2">
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <input type="hidden" name="countryId" value={countryId} />
      <Button type="submit" disabled={unavailable} aria-disabled={unavailable}>
        {pending ? (
          <>
            <RotateCcw className="h-4 w-4 animate-spin" /> Analyzing market…
          </>
        ) : (
          <>
            {mode === "retry" ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {mode === "retry" ? "Retry analysis" : "Analyze market"}
          </>
        )}
      </Button>
      {state && (
        <p
          role="status"
          aria-live="polite"
          className={state.status === "success" ? "text-sm text-success" : "text-sm text-danger"}
        >
          {state.message}
          {state.status !== "success" ? ` Reference: ${state.reference}` : ""}
        </p>
      )}
    </form>
  );
}
