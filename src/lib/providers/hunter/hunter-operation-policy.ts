import { enforceRateLimit } from "@/lib/security/rate-limit-service";

export type HunterOperation =
  "company_discovery" | "buyer_discovery" | "email_enrichment" | "email_verification";

export type HunterOperationContext = {
  workspaceId: string;
  userId: string;
  projectId: string;
  operation: HunterOperation;
  authorize: (input: {
    workspaceId: string;
    userId: string;
    projectId: string;
    operation: HunterOperation;
  }) => Promise<boolean>;
};

/**
 * Mandatory boundary for future Hunter buyer/email UI services. Company discovery
 * already performs equivalent ownership, plan, and rate checks in its execution service.
 */
export async function authorizeHunterOperation(context: HunterOperationContext): Promise<void> {
  if (!(await context.authorize(context))) {
    throw new Error("This provider operation is not available for this workspace.");
  }
  await enforceRateLimit({
    operation: context.operation,
    userId: context.userId,
    workspaceId: context.workspaceId,
  });
}
