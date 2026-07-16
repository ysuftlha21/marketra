import { z } from "zod";

export const marketAnalysisRunStatusSchema = z.enum(["pending", "running", "succeeded", "failed"]);
export type MarketAnalysisRunStatus = z.infer<typeof marketAnalysisRunStatusSchema>;

export function isTerminal(status: MarketAnalysisRunStatus): boolean {
  return status === "succeeded" || status === "failed";
}

export function canRetry(status: MarketAnalysisRunStatus | null): boolean {
  return status === null || status === "failed";
}

export function isRunning(status: MarketAnalysisRunStatus): boolean {
  return status === "pending" || status === "running";
}
