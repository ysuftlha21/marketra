"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, RotateCcw } from "lucide-react";
import { runAnalysisAction, retryAnalysisAction } from "@/features/projects/api/project-actions";
import { Button } from "@/components/ui/button";

interface RunAnalysisButtonProps {
  projectSlug: string;
  canRun: boolean;
  isRetry?: boolean;
  previousRunId?: string;
  status?: string;
  runId?: string;
}

export function RunAnalysisButton({
  projectSlug,
  canRun,
  isRetry,
  previousRunId,
  status,
  runId,
}: RunAnalysisButtonProps) {
  const router = useRouter();
  const [localPending, setLocalPending] = React.useState(false);
  const [isTransitioning, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const isServerPending = status === "pending" || status === "running";
  const pending = localPending || isTransitioning || isServerPending;

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isServerPending) {
      interval = setInterval(() => {
        router.refresh();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isServerPending, router]);

  const prevStatus = React.useRef<{ id?: string; status?: string }>({ id: runId, status });
  React.useEffect(() => {
    const wasPending =
      prevStatus.current.status === "running" || prevStatus.current.status === "pending";
    const isNowFinished = status === "succeeded" || status === "failed" || status === "cancelled";

    // Check if the current run just finished, OR if a NEW run appeared and it's already finished
    if (
      (wasPending && isNowFinished && prevStatus.current.id === runId) ||
      (prevStatus.current.id !== runId && isNowFinished)
    ) {
      setTimeout(() => {
        setLocalPending(false);
        if (status === "succeeded") {
          setSuccess("Analysis completed successfully.");
          setError(null);
        } else if (status === "failed") {
          setError("Analysis failed. Try again.");
          setSuccess(null);
        }
      }, 0);
    }
    prevStatus.current = { id: runId, status };
  }, [status, runId]);

  async function handleClick() {
    setLocalPending(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.set("projectSlug", projectSlug);

      let res: { ok?: boolean; error?: string; runId?: string } | undefined;
      if (isRetry && previousRunId) {
        formData.set("previousRunId", previousRunId);
        res = await retryAnalysisAction(formData);
      } else {
        res = await runAnalysisAction(formData);
      }
      if (res?.error) {
        setError(res.error);
        setLocalPending(false);
      } else {
        startTransition(() => {
          router.refresh();
          setLocalPending(false);
        });
      }
    } catch {
      setError("Failed to start analysis.");
      setLocalPending(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant={isRetry ? "outline" : "default"}
        disabled={!canRun || pending}
        onClick={handleClick}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running…
          </>
        ) : isRetry ? (
          <>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden /> Run again
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" aria-hidden /> Start analysis
          </>
        )}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {success && !error && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400" role="status">
          {success}
        </p>
      )}
    </div>
  );
}
