import { z } from "zod";

export const analysisRunStatusSchema = z.enum(["pending", "running", "succeeded", "failed"]);
export type AnalysisRunStatus = z.infer<typeof analysisRunStatusSchema>;

export const ANALYSIS_RUN_STATUSES = ["pending", "running", "succeeded", "failed"] as const;

export function isTerminal(status: AnalysisRunStatus): boolean {
  return status === "succeeded" || status === "failed";
}

export function canRetry(status: AnalysisRunStatus | null): boolean {
  return status === null || status === "failed";
}

export function isRunning(status: AnalysisRunStatus): boolean {
  return status === "pending" || status === "running";
}
