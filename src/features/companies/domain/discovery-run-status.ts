import { z } from "zod";

export const discoveryRunStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
export type DiscoveryRunStatus = z.infer<typeof discoveryRunStatusSchema>;

export function isTerminal(status: DiscoveryRunStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export function canRetry(status: DiscoveryRunStatus | null): boolean {
  return status === null || status === "failed" || status === "cancelled";
}

export function isActive(status: DiscoveryRunStatus): boolean {
  return status === "queued" || status === "running";
}
