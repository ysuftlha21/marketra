import { createHash, timingSafeEqual } from "node:crypto";

const WINDOW_MS = 5 * 60_000;
const MAX_EXECUTIONS = 2;
const activeSubjects = new Set<string>();
const executionBuckets = new Map<string, { count: number; resetAt: number }>();

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function hasValidPreviewSmokeBearer(
  authorization: string | null,
  expectedToken: string,
): boolean {
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  const supplied = match?.[1] ?? "";
  const equal = timingSafeEqual(digest(supplied), digest(expectedToken));
  return Boolean(match && expectedToken && equal);
}

export function previewSmokeSubject(token: string): string {
  return digest(token).toString("hex");
}

export function consumePreviewSmokeExecution(
  subject: string,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const current = executionBuckets.get(subject);
  const bucket =
    !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  bucket.count += 1;
  executionBuckets.set(subject, bucket);
  return {
    allowed: bucket.count <= MAX_EXECUTIONS,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function acquirePreviewSmokeExecution(subject: string): boolean {
  if (activeSubjects.has(subject)) return false;
  activeSubjects.add(subject);
  return true;
}

export function releasePreviewSmokeExecution(subject: string): void {
  activeSubjects.delete(subject);
}

export function resetPreviewSmokeGuardsForTests(): void {
  activeSubjects.clear();
  executionBuckets.clear();
}
