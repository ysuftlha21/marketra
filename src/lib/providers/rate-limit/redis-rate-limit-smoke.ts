import { randomUUID } from "node:crypto";
import { RateLimitProviderUnavailableError, type RateLimitProvider } from "./rate-limit.provider";

export type RedisRateLimitSmokeFailureCategory =
  | "redis_connectivity_failed"
  | "redis_auth_failed"
  | "redis_command_unsupported"
  | "redis_eval_failed"
  | "redis_response_invalid"
  | "redis_timeout"
  | "atomic_consume_failed"
  | "ttl_validation_failed"
  | "remaining_validation_failed"
  | "cleanup_failed"
  | "smoke_internal_error";

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
  failureCategory?: RedisRateLimitSmokeFailureCategory;
}

function providerFailureCategory(error: unknown, fallback: RedisRateLimitSmokeFailureCategory) {
  if (!(error instanceof RateLimitProviderUnavailableError)) return fallback;
  if (error.reason === "auth_failed") return "redis_auth_failed";
  if (error.reason === "command_unsupported") return "redis_command_unsupported";
  if (error.reason === "response_invalid") return "redis_response_invalid";
  if (error.reason === "timeout") return "redis_timeout";
  return "redis_connectivity_failed";
}

export async function runRedisRateLimitSmoke(
  provider: RateLimitProvider,
  options: { namespace?: string } = {},
): Promise<RedisRateLimitSmokeResult> {
  const operationId = randomUUID();
  const key = `${options.namespace ?? "marketra"}:smoke:preview:${operationId}`;
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
    try {
      if (provider.diagnoseHealth) await provider.diagnoseHealth();
      else if (!(await provider.healthCheck())) {
        result.failureCategory = "redis_connectivity_failed";
        return result;
      }
    } catch (error) {
      result.failureCategory = providerFailureCategory(error, "redis_connectivity_failed");
      return result;
    }
    const attempts = await Promise.allSettled([
      provider.consume(request),
      provider.consume(request),
      provider.consume(request),
    ]);
    const rejected = attempts.find((attempt) => attempt.status === "rejected");
    if (rejected?.status === "rejected") {
      result.failureCategory = providerFailureCategory(rejected.reason, "redis_eval_failed");
      return result;
    }
    const consumed = attempts.map((attempt) =>
      attempt.status === "fulfilled" ? attempt.value : undefined,
    );
    if (consumed.some((item) => !item)) {
      result.failureCategory = "redis_response_invalid";
      return result;
    }
    const completed = consumed.filter((item) => item !== undefined);
    result.evalSupported = true;
    result.atomicConsumePassed = completed.filter((item) => item.allowed).length === 2;
    result.denialPassed = completed.filter((item) => !item.allowed).length === 1;
    if (!result.atomicConsumePassed || !result.denialPassed) {
      result.failureCategory = "atomic_consume_failed";
      return result;
    }
    result.ttlPassed = completed.every(
      (item) => item.resetAt > Date.now() && item.retryAfterSeconds > 0,
    );
    if (!result.ttlPassed) {
      result.failureCategory = "ttl_validation_failed";
      return result;
    }
    try {
      result.remainingPassed = provider.getRemaining
        ? (await provider.getRemaining(request)) === 0
        : true;
    } catch (error) {
      result.failureCategory = providerFailureCategory(error, "remaining_validation_failed");
      return result;
    }
    if (!result.remainingPassed) result.failureCategory = "remaining_validation_failed";
  } catch {
    result.failureCategory = "smoke_internal_error";
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
      result.failureCategory = "cleanup_failed";
    }
  }

  result.ok =
    result.evalSupported &&
    result.atomicConsumePassed &&
    result.denialPassed &&
    result.ttlPassed &&
    result.remainingPassed &&
    result.cleanupPassed;
  if (result.ok) delete result.failureCategory;
  else if (!result.failureCategory) result.failureCategory = "smoke_internal_error";
  return result;
}
