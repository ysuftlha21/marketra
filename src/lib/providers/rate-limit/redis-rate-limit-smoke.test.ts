import { describe, expect, it, vi } from "vitest";
import type { RateLimitProvider, RateLimitRequest } from "./rate-limit.provider";
import { runRedisRateLimitSmoke } from "./redis-rate-limit-smoke";

function providerFixture(options?: { failConsume?: boolean; healthy?: boolean }) {
  let count = 0;
  const touchedKeys: string[] = [];
  const reset = vi.fn(async () => {
    count = 0;
  });
  const provider: RateLimitProvider = {
    id: "redis",
    healthCheck: vi.fn(async () => options?.healthy !== false),
    consume: vi.fn(async (request: RateLimitRequest) => {
      touchedKeys.push(request.key);
      if (options?.failConsume) throw new Error("raw Redis failure");
      count += 1;
      return {
        allowed: count <= request.limit,
        remaining: Math.max(0, request.limit - count),
        limit: request.limit,
        resetAt: Date.now() + request.windowMs,
        retryAfterSeconds: 10,
        operationId: "provider-operation",
      };
    }),
    check: vi.fn(),
    getRemaining: vi.fn(async (request: RateLimitRequest) => Math.max(0, request.limit - count)),
    reset,
  };
  return { provider, reset, touchedKeys };
}

describe("runRedisRateLimitSmoke", () => {
  it("verifies atomic consume, denial, TTL, remaining, and cleanup", async () => {
    const fixture = providerFixture();
    const result = await runRedisRateLimitSmoke(fixture.provider);
    expect(result).toMatchObject({
      ok: true,
      providerConfigured: true,
      evalSupported: true,
      atomicConsumePassed: true,
      denialPassed: true,
      ttlPassed: true,
      remainingPassed: true,
      cleanupPassed: true,
    });
    expect(result.operationId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(fixture.reset).toHaveBeenCalledOnce();
    expect(fixture.touchedKeys).toHaveLength(3);
    expect(fixture.touchedKeys.every((key) => key.startsWith("marketra:smoke:preview:"))).toBe(
      true,
    );
    expect(fixture.touchedKeys.some((key) => /workspace|user|email/i.test(key))).toBe(false);
  });

  it("cleans up after an EVAL/consume failure without leaking diagnostics", async () => {
    const fixture = providerFixture({ failConsume: true });
    const result = await runRedisRateLimitSmoke(fixture.provider);
    expect(result.ok).toBe(false);
    expect(result.evalSupported).toBe(false);
    expect(result.cleanupPassed).toBe(true);
    expect(fixture.reset).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain("raw Redis failure");
  });

  it("attempts cleanup after a connectivity failure", async () => {
    const fixture = providerFixture({ healthy: false });
    const result = await runRedisRateLimitSmoke(fixture.provider);
    expect(result.ok).toBe(false);
    expect(fixture.reset).toHaveBeenCalledOnce();
  });
});
