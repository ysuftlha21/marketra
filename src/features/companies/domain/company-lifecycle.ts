import { z } from "zod";

export const projectCompanyStatusSchema = z.enum([
  "discovered",
  "shortlisted",
  "approved",
  "rejected",
  "archived",
]);
export type ProjectCompanyStatus = z.infer<typeof projectCompanyStatusSchema>;

export function canShortlist(status: ProjectCompanyStatus): boolean {
  return status === "discovered";
}

export function canApprove(status: ProjectCompanyStatus): boolean {
  return status === "shortlisted";
}

export function canReject(status: ProjectCompanyStatus): boolean {
  return status === "discovered" || status === "shortlisted";
}

export function canRestore(status: ProjectCompanyStatus): boolean {
  return status === "rejected" || status === "archived";
}

export function canArchive(status: ProjectCompanyStatus): boolean {
  return status === "discovered" || status === "shortlisted" || status === "approved";
}
