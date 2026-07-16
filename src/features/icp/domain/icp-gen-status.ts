import { z } from "zod";

export const icpGenRunStatusSchema = z.enum(["pending", "running", "succeeded", "failed"]);
export type IcpGenRunStatus = z.infer<typeof icpGenRunStatusSchema>;

export function isTerminal(s: IcpGenRunStatus) {
  return s === "succeeded" || s === "failed";
}
export function canRetry(s: IcpGenRunStatus | null) {
  return s === null || s === "failed";
}
