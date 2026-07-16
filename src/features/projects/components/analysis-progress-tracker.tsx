"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { getAnalysisRunStatusAction } from "../api/project-actions";

export const ANALYSIS_STAGES = [
  { id: "preparing_project_data", label: "Preparing project data" },
  { id: "validating_website", label: "Validating website" },
  { id: "reading_website_content", label: "Reading website content" },
  { id: "preparing_product_context", label: "Preparing product context" },
  { id: "running_intelligence_analysis", label: "Running product intelligence analysis" },
  { id: "validating_analysis_output", label: "Validating analysis output" },
  { id: "saving_results", label: "Saving analysis results" },
  { id: "finalizing_analysis", label: "Finalizing analysis" },
];

export function AnalysisProgressTracker({
  runId,
  initialStatus,
  initialStage,
}: {
  runId: string;
  initialStatus: string;
  initialStage: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [currentStage, setCurrentStage] = useState<string | null>(initialStage);

  useEffect(() => {
    if (status === "succeeded" || status === "failed" || status === "cancelled") {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const res = await getAnalysisRunStatusAction(runId);
        if (res) {
          setStatus(res.status);
          setCurrentStage(res.current_stage);
          if (res.status === "succeeded" || res.status === "failed") {
            // Stop polling but reload the page so the final result is rendered by the server component
            window.location.reload();
          }
        }
      } catch (err) {
        console.error("Failed to fetch analysis status:", err);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [runId, status]);

  const currentIndex = ANALYSIS_STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">Analysis running…</p>
      </div>
      <div className="space-y-3">
        {ANALYSIS_STAGES.map((stage, index) => {
          const isCompleted = currentStage ? index < currentIndex : false;
          const isActive = currentStage === stage.id || (!currentStage && index === 0);

          return (
            <div key={stage.id} className="flex items-center gap-3">
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : isActive ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
              )}
              <span
                className={`text-sm ${isActive ? "text-foreground font-medium" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/60"}`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
