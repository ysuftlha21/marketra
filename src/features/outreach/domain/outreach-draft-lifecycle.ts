import { z } from "zod";
import type { WorkspaceRole } from "@/features/workspaces/domain/roles";

export const outreachDraftStatusSchema = z.enum(["draft", "approved", "rejected", "archived"]);
export type OutreachDraftStatus = z.infer<typeof outreachDraftStatusSchema>;

export const outreachDraftContentSchema = z
  .object({
    draftId: z.string().uuid(),
    expectedVersion: z.coerce.number().int().positive(),
    subject: z.string().trim().max(240).nullable().optional(),
    body: z.string().trim().min(1).max(10_000),
  })
  .strict();

export const outreachDraftTransitionSchema = z
  .object({
    draftId: z.string().uuid(),
    expectedVersion: z.coerce.number().int().positive(),
    transition: z.enum(["approve", "reject", "reopen", "archive"]),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.transition === "reject" && !value.reason) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "Add a rejection reason." });
    }
  });

export const outreachDraftRestoreSchema = z.object({
  draftId: z.string().uuid(),
  versionNumber: z.coerce.number().int().positive(),
  expectedVersion: z.coerce.number().int().positive(),
});

const transitions: Record<OutreachDraftStatus, readonly OutreachDraftStatus[]> = {
  draft: ["approved", "rejected", "archived"],
  approved: ["archived"],
  rejected: ["draft", "archived"],
  archived: [],
};

export function canTransitionDraft(from: OutreachDraftStatus, to: OutreachDraftStatus) {
  return transitions[from].includes(to);
}

export function canReviewOutreach(role: WorkspaceRole) {
  return role === "owner" || role === "admin";
}

export function canEditOutreach(role: WorkspaceRole) {
  return role === "owner" || role === "admin" || role === "member";
}
