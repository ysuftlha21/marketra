import { z } from "zod";

export const icpProfileStatusSchema = z.enum(["draft", "approved", "rejected", "archived"]);
export type IcpProfileStatus = z.infer<typeof icpProfileStatusSchema>;

export function canEdit(status: IcpProfileStatus): boolean {
  return status === "draft" || status === "rejected";
}
export function canApprove(status: IcpProfileStatus): boolean {
  return status === "draft";
}
export function canReject(status: IcpProfileStatus): boolean {
  return status === "draft";
}
export function canRestore(status: IcpProfileStatus): boolean {
  return status === "rejected";
}
export function canArchive(status: IcpProfileStatus): boolean {
  return status === "draft" || status === "rejected" || status === "approved";
}
