import { z } from "zod";

export const targetCountryStatusSchema = z.enum([
  "selected",
  "analyzing",
  "analyzed",
  "shortlisted",
  "rejected",
]);
export type TargetCountryStatus = z.infer<typeof targetCountryStatusSchema>;

export const TARGET_COUNTRY_STATUSES = [
  "selected",
  "analyzing",
  "analyzed",
  "shortlisted",
  "rejected",
] as const;

export function canStartAnalysis(status: TargetCountryStatus): boolean {
  return status === "selected" || status === "analyzed";
}

export function canRetryAnalysis(status: TargetCountryStatus): boolean {
  return status === "analyzed";
}

export function canShortlist(status: TargetCountryStatus): boolean {
  return status === "analyzed";
}

export function canReject(status: TargetCountryStatus): boolean {
  return status === "analyzed" || status === "shortlisted";
}

export function canRestore(status: TargetCountryStatus): boolean {
  return status === "shortlisted" || status === "rejected";
}

export function canRemove(status: TargetCountryStatus): boolean {
  return status === "selected" || status === "analyzing";
}

export function transitionForAnalysisStart(status: TargetCountryStatus): TargetCountryStatus {
  if (status === "selected" || status === "analyzed") return "analyzing";
  return status;
}
