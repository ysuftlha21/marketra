import { describe, expect, it } from "vitest";
import { RedisRateLimitProvider } from "@/lib/providers/rate-limit/redis-rate-limit.provider";
import { runRedisRateLimitSmoke } from "@/lib/providers/rate-limit/redis-rate-limit-smoke";
import { parseServerEnv } from "@/lib/env/env";

const enabled = process.env.RATE_LIMIT_REDIS_SMOKE === "true";

describe.skipIf(!enabled)("Redis durable rate-limit smoke", () => {
  it("supports EVAL, atomic denial, TTL, and disposable cleanup", async () => {
    const env = parseServerEnv();
    const url = env.RATE_LIMIT_REDIS_URL;
    const token = env.RATE_LIMIT_REDIS_TOKEN;
    if (!url || !token) throw new Error("Redis smoke credentials are not configured.");

    const provider = new RedisRateLimitProvider({ url, token, timeoutMs: 3_000 });
    await expect(runRedisRateLimitSmoke(provider)).resolves.toMatchObject({
      ok: true,
      evalSupported: true,
      atomicConsumePassed: true,
      denialPassed: true,
      ttlPassed: true,
      remainingPassed: true,
      cleanupPassed: true,
    });
  });
});
