import { randomUUID } from "node:crypto";
import type { RateLimitProvider } from "./rate-limit.provider";

export interface RedisRateLimitSmokeResult {
  ok: boolean;
  providerConfigured: boolean;
  evalSupported: boolean;
  atomicConsumePassed: boolean;
  denialPassed: boolean;
  ttlPassed: boolean;
  remainingPassed: boolean;
  cleanupPassed: boolean;
  operationId: string;
}

export async function runRedisRateLimitSmoke(
  provider: RateLimitProvider,
): Promise<RedisRateLimitSmokeResult> {
  const operationId = randomUUID();
  const key = `marketra:smoke:preview:${operationId}`;
  const request = { key, limit: 2, windowMs: 10_000 };
  const result: RedisRateLimitSmokeResult = {
    ok: false,
    providerConfigured: true,
    evalSupported: false,
    atomicConsumePassed: false,
    denialPassed: false,
    ttlPassed: false,
    remainingPassed: false,
    cleanupPassed: false,
    operationId,
  };

  try {
    if (!(await provider.healthCheck())) return result;
    const attempts = await Promise.allSettled([
      provider.consume(request),
      provider.consume(request),
      provider.consume(request),
    ]);
    if (attempts.some((attempt) => attempt.status === "rejected")) return result;
    const consumed = attempts.map((attempt) =>
      attempt.status === "fulfilled" ? attempt.value : undefined,
    );
    if (consumed.some((item) => !item)) return result;
    const completed = consumed.filter((item) => item !== undefined);
    result.evalSupported = true;
    result.atomicConsumePassed = completed.filter((item) => item.allowed).length === 2;
    result.denialPassed = completed.filter((item) => !item.allowed).length === 1;
    result.ttlPassed = completed.every(
      (item) => item.resetAt > Date.now() && item.retryAfterSeconds > 0,
    );
    result.remainingPassed = provider.getRemaining
      ? (await provider.getRemaining(request)) === 0
      : true;
  } catch {
    // Safe flags communicate the failed assertion without provider diagnostics.
  } finally {
    try {
      if (provider.reset) {
        await provider.reset(key);
        result.cleanupPassed = provider.getRemaining
          ? (await provider.getRemaining(request)) === request.limit
          : true;
      }
    } catch {
      result.cleanupPassed = false;
    }
  }

  result.ok =
    result.evalSupported &&
    result.atomicConsumePassed &&
    result.denialPassed &&
    result.ttlPassed &&
    result.remainingPassed &&
    result.cleanupPassed;
  return result;
}
