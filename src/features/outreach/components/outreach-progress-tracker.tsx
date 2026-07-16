"use client";

import { Loader2, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STAGES = [
  { id: "queued", label: "Preparing request" },
  { id: "loading_product_context", label: "Loading product context" },
  { id: "loading_market_context", label: "Loading market context" },
  { id: "loading_icp", label: "Loading ICP" },
  { id: "loading_company_context", label: "Loading company information" },
  { id: "loading_decision_role", label: "Loading decision-maker role" },
  { id: "generating_outreach", label: "Generating outreach draft" },
  { id: "validating_result", label: "Validating message quality" },
  { id: "saving_draft", label: "Saving draft" },
  { id: "complete", label: "Complete" },
];

interface OutreachProgressTrackerProps {
  currentStage: string | null;
  status: string | null;
  safeErrorMessage: string | null;
}

export function OutreachProgressTracker({
  currentStage,
  status,
  safeErrorMessage,
}: OutreachProgressTrackerProps) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-5 py-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Generating outreach…</p>
        </div>

        <div className="space-y-3">
          {STAGES.map((stage, index) => {
            const isCompleted = currentStage ? index < currentIndex : false;
            const isActive = currentStage === stage.id || (!currentStage && index === 0);
            const isFailed = status === "failed" && index === currentIndex;

            return (
              <div key={stage.id} className="flex items-center gap-3">
                {isFailed ? (
                  <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
                ) : isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    isFailed
                      ? "text-danger"
                      : isActive
                        ? "text-foreground font-medium"
                        : isCompleted
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {status === "failed" && safeErrorMessage && (
          <div className="rounded-md bg-danger/10 p-3">
            <p className="text-sm text-danger">{safeErrorMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
