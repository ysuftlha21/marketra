import { z } from "zod";

export const projectStatusSchema = z.enum(["draft", "active", "archived"]);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const PROJECT_STATUSES = ["draft", "active", "archived"] as const;

export function canEditProject(status: ProjectStatus): boolean {
  return status !== "archived";
}

export function canDeleteProject(status: ProjectStatus): boolean {
  return status === "draft";
}

export function canRunAnalysis(status: ProjectStatus): boolean {
  return status !== "archived";
}
