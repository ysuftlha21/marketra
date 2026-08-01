import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { RedisRateLimitProvider } from "@/lib/providers/rate-limit/redis-rate-limit.provider";

const enabled = process.env.RATE_LIMIT_REDIS_SMOKE === "true";

describe.skipIf(!enabled)("Redis durable rate-limit smoke", () => {
  it("supports EVAL, atomic denial, TTL, and disposable cleanup", async () => {
    const url = process.env.RATE_LIMIT_REDIS_URL;
    const token = process.env.RATE_LIMIT_REDIS_TOKEN;
    if (!url || !token) throw new Error("Redis smoke credentials are not configured.");

    const provider = new RedisRateLimitProvider({ url, token, timeoutMs: 3_000 });
    const key = `marketra:smoke:${randomUUID()}`;
    const request = { key, limit: 2, windowMs: 10_000 };
    try {
      const results = await Promise.all([
        provider.consume(request),
        provider.consume(request),
        provider.consume(request),
      ]);
      expect(results.filter((result) => result.allowed)).toHaveLength(2);
      expect(results.filter((result) => !result.allowed)).toHaveLength(1);
      expect(results.every((result) => result.resetAt > Date.now())).toBe(true);
      expect(await provider.getRemaining(request)).toBe(0);
    } finally {
      await provider.reset?.(key);
    }
    expect(await provider.getRemaining(request)).toBe(2);
  });
});
