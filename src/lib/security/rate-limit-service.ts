import { parseServerEnv } from "@/lib/env/env";
import { createRateLimitProvider } from "@/lib/providers/rate-limit/rate-limit.factory";
import {
  RateLimitExceededError,
  RateLimitProviderUnavailableError,
  type RateLimitResult,
} from "@/lib/providers/rate-limit/rate-limit.provider";
import { buildRateLimitKey } from "./rate-limit-key";
import { getRateLimitPolicy, RATE_LIMIT_POLICIES } from "./rate-limit-policy";
import { logOperation } from "@/lib/observability/logger";

export const FAIL_CLOSED_RATE_LIMIT_OPERATIONS = new Set(
  Object.entries(RATE_LIMIT_POLICIES)
    .filter(([, policy]) => policy.failClosed)
    .map(([name]) => name),
);

export async function enforceRateLimit(input: {
  operation: string;
  userId: string;
  workspaceId?: string;
  projectId?: string;
  sensitiveIdentifier?: string;
  limit?: number;
}): Promise<RateLimitResult> {
  const env = parseServerEnv();
  const policy = getRateLimitPolicy(input.operation);
  const startedAt = Date.now();
  const providerId = env.DEFAULT_RATE_LIMIT_PROVIDER ?? "mock";
  const request = {
    key: buildRateLimitKey({
      namespace: env.RATE_LIMIT_NAMESPACE ?? "marketra",
      environment: env.APP_ENV ?? env.NODE_ENV,
      operation: input.operation,
      userId: input.userId,
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      sensitiveIdentifier: input.sensitiveIdentifier,
    }),
    limit: input.limit ?? policy.limit ?? env.RATE_LIMIT_MAX_REQUESTS ?? 60,
    windowMs: policy.windowSeconds * 1000,
  };
  try {
    const provider = createRateLimitProvider(providerId, {
      url: env.RATE_LIMIT_REDIS_URL,
      token: env.RATE_LIMIT_REDIS_TOKEN,
      timeoutMs: env.RATE_LIMIT_REQUEST_TIMEOUT_MS,
    });
    const result = await provider.consume(request);
    if (!result.allowed) {
      logOperation({
        operationId: result.operationId,
        operation: input.operation,
        operationType: "rate_limit.consume",
        providerId: provider.id,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        durationMs: Date.now() - startedAt,
        success: false,
        controlledErrorCode: "rate_limited",
        environment: env.APP_ENV ?? env.NODE_ENV,
      });
      throw new RateLimitExceededError(result);
    }
    return result;
  } catch (error) {
    if (error instanceof RateLimitExceededError) throw error;
    if (policy.failClosed || env.RATE_LIMIT_FAIL_CLOSED) {
      logOperation({
        operationId: randomUUID(),
        operation: input.operation,
        operationType: "rate_limit.consume",
        providerId,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        durationMs: Date.now() - startedAt,
        success: false,
        controlledErrorCode: "provider_unavailable",
        environment: env.APP_ENV ?? env.NODE_ENV,
      });
      throw new RateLimitProviderUnavailableError();
    }
    return {
      allowed: true,
      remaining: 0,
      limit: request.limit,
      resetAt: Date.now() + request.windowMs,
      retryAfterSeconds: 0,
      operationId: randomUUID(),
    };
  }
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    "Retry-After": String(result.retryAfterSeconds),
  };
}

export function safeRateLimitMessage(error: unknown): string | null {
  if (error instanceof RateLimitProviderUnavailableError)
    return "This protected action is temporarily unavailable. Please try again shortly.";
  if (!(error instanceof RateLimitExceededError)) return null;
  return `Too many requests. Please wait ${error.retryAfterSeconds} seconds and try again.`;
}
import { randomUUID } from "node:crypto";
