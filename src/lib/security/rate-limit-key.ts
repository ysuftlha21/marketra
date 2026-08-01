import { createHash } from "node:crypto";

export function hashRateLimitIdentifier(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function buildRateLimitKey(input: {
  namespace: string;
  environment: string;
  operation: string;
  userId: string;
  workspaceId?: string;
  projectId?: string;
  sensitiveIdentifier?: string;
}) {
  const segments = [input.namespace, input.environment, input.operation];
  if (input.workspaceId) segments.push(`w:${hashRateLimitIdentifier(input.workspaceId)}`);
  if (input.projectId) segments.push(`p:${hashRateLimitIdentifier(input.projectId)}`);
  segments.push(`u:${hashRateLimitIdentifier(input.userId)}`);
  if (input.sensitiveIdentifier)
    segments.push(`s:${hashRateLimitIdentifier(input.sensitiveIdentifier)}`);
  return segments.join(":");
}
