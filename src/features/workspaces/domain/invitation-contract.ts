import { z } from "zod";
import { workspaceRoleSchema } from "@/features/workspaces/domain/roles";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const createInvitationInputSchema = z.object({
  email: emailSchema,
  role: workspaceRoleSchema.default("member").refine((r) => r !== "owner", {
    message: "Invitations cannot grant owner role",
  }),
});
export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;

export const acceptInvitationInputSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationInputSchema>;

export interface InvitationRecord {
  id: string;
  workspaceId: string;
  email: string;
  role: "owner" | "admin" | "member";
  expiresAt: string;
  acceptedAt: string | null;
  cancelledAt: string | null;
}

/**
 * Invitation service contract.
 * Full UI is deferred to a bounded follow-up task (documented in phase-plan.md).
 * The EmailProvider is used to *deliver* the plaintext token to the matched email — mock only,
 * development — no personal contact data is scraped or stored beyond the invite email itself.
 */
export interface InvitationService {
  /** Create an invitation. Stores SHA-256(token) only; returns the plaintext token once. */
  create(input: CreateInvitationInput): Promise<{ token: string; expiresAt: string }>;
  /** Cancel a pending invitation. */
  cancel(invitationId: string): Promise<void>;
  /** List pending invitations for a workspace. */
  list(workspaceId: string): Promise<InvitationRecord[]>;
  /** Accept an invitation by token. The authenticated user's email must match. */
  accept(token: string): Promise<{ workspaceId: string }>;
}
