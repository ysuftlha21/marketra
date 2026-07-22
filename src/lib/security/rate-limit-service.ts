import { parseServerEnv } from "@/lib/env/env";
import { createRateLimitProvider } from "@/lib/providers/rate-limit/rate-limit.factory";
import { RateLimitExceededError } from "@/lib/providers/rate-limit/rate-limit.provider";

export async function enforceRateLimit(input: {
  operation: string;
  userId: string;
  workspaceId?: string;
  limit?: number;
}): Promise<void> {
  const env = parseServerEnv();
  // Some focused service tests mock an older, partial environment shape. The
  // runtime parser always supplies this default; retaining it here keeps the
  // security extension backward-compatible with those isolated callers.
  const provider = createRateLimitProvider(env.DEFAULT_RATE_LIMIT_PROVIDER ?? "mock", {
    url: env.RATE_LIMIT_API_URL,
    token: env.RATE_LIMIT_API_TOKEN,
    timeoutMs: env.RATE_LIMIT_PROVIDER_TIMEOUT_MS,
  });
  const scope = input.workspaceId ? `workspace:${input.workspaceId}` : `user:${input.userId}`;
  const result = await provider.consume({
    key: `${scope}:user:${input.userId}:operation:${input.operation}`,
    limit: input.limit ?? env.RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.RATE_LIMIT_WINDOW_SECONDS * 1000,
  });
  if (!result.allowed) throw new RateLimitExceededError(result.retryAfterSeconds ?? 1);
}

export function safeRateLimitMessage(error: unknown): string | null {
  if (!(error instanceof RateLimitExceededError)) return null;
  return `Too many requests. Please wait ${error.retryAfterSeconds} seconds and try again.`;
}
