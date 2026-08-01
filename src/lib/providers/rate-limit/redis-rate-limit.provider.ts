import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { RateLimitProvider, RateLimitRequest, RateLimitResult } from "./rate-limit.provider";
import { RateLimitProviderUnavailableError } from "./rate-limit.provider";

const redisResponseSchema = z.object({ result: z.unknown() });
const FIXED_WINDOW_SCRIPT = `local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end; local ttl = redis.call('PTTL', KEYS[1]); return {count, ttl}`;

export class RedisRateLimitProvider implements RateLimitProvider {
  readonly id = "redis";
  constructor(private readonly config: { url: string; token: string; timeoutMs: number }) {}

  private async command(command: unknown[]): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(command),
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new RateLimitProviderUnavailableError("auth_failed");
        }
        if ([400, 404, 405, 422].includes(response.status)) {
          throw new RateLimitProviderUnavailableError("command_unsupported");
        }
        if (response.status === 408 || response.status === 504) {
          throw new RateLimitProviderUnavailableError("timeout");
        }
        throw new RateLimitProviderUnavailableError("connectivity_failed");
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new RateLimitProviderUnavailableError("response_invalid");
      }
      const parsed = redisResponseSchema.safeParse(payload);
      if (!parsed.success) throw new RateLimitProviderUnavailableError("response_invalid");
      return parsed.data.result;
    } catch (error) {
      if (error instanceof RateLimitProviderUnavailableError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new RateLimitProviderUnavailableError("timeout");
      }
      throw new RateLimitProviderUnavailableError("connectivity_failed");
    } finally {
      clearTimeout(timer);
    }
  }

  async consume(request: RateLimitRequest): Promise<RateLimitResult> {
    const result = await this.command([
      "EVAL",
      FIXED_WINDOW_SCRIPT,
      "1",
      request.key,
      String(request.limit),
      String(request.windowMs),
    ]);
    const parsed = z
      .tuple([z.coerce.number().int().positive(), z.coerce.number().int()])
      .safeParse(result);
    if (!parsed.success || parsed.data[1] < 0) {
      throw new RateLimitProviderUnavailableError("response_invalid");
    }
    const [count, ttl] = parsed.data;
    const now = Date.now();
    return {
      allowed: count <= request.limit,
      remaining: Math.max(0, request.limit - count),
      limit: request.limit,
      resetAt: now + ttl,
      retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)),
      operationId: randomUUID(),
    };
  }

  async check(request: RateLimitRequest): Promise<RateLimitResult> {
    const result = await this.command(["MGET", request.key]);
    const parsed = z.tuple([z.coerce.number().int().nonnegative().nullable()]).safeParse(result);
    if (!parsed.success) throw new RateLimitProviderUnavailableError("response_invalid");
    const count = parsed.data[0] ?? 0;
    return {
      allowed: count < request.limit,
      remaining: Math.max(0, request.limit - count),
      limit: request.limit,
      resetAt: Date.now() + request.windowMs,
      retryAfterSeconds: Math.ceil(request.windowMs / 1000),
      operationId: randomUUID(),
    };
  }
  async reset(key: string) {
    await this.command(["DEL", key]);
  }
  async healthCheck() {
    try {
      await this.diagnoseHealth();
      return true;
    } catch {
      return false;
    }
  }
  async diagnoseHealth() {
    if ((await this.command(["PING"])) !== "PONG") {
      throw new RateLimitProviderUnavailableError("response_invalid");
    }
  }
  async getRemaining(request: RateLimitRequest) {
    return (await this.check(request)).remaining;
  }
}
