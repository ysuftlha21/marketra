import type { RateLimitProvider, RateLimitRequest, RateLimitResult } from "./rate-limit.provider";

interface Bucket {
  count: number;
  resetsAt: number;
}

export class InMemoryRateLimitProvider implements RateLimitProvider {
  readonly id = "memory";
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly now: () => number = Date.now) {}

  async consume(request: RateLimitRequest): Promise<RateLimitResult> {
    const now = this.now();
    const current = this.buckets.get(request.key);
    const bucket =
      !current || current.resetsAt <= now
        ? { count: 0, resetsAt: now + request.windowMs }
        : current;
    bucket.count += 1;
    this.buckets.set(request.key, bucket);
    const allowed = bucket.count <= request.limit;
    return {
      allowed,
      remaining: Math.max(0, request.limit - bucket.count),
      limit: request.limit,
      resetAt: bucket.resetsAt,
      retryAfterSeconds: Math.max(0, Math.ceil((bucket.resetsAt - now) / 1000)),
      operationId: randomUUID(),
    };
  }

  async check(request: RateLimitRequest): Promise<RateLimitResult> {
    const now = this.now();
    const bucket = this.buckets.get(request.key);
    const count = !bucket || bucket.resetsAt <= now ? 0 : bucket.count;
    const resetAt = !bucket || bucket.resetsAt <= now ? now + request.windowMs : bucket.resetsAt;
    return {
      allowed: count < request.limit,
      remaining: Math.max(0, request.limit - count),
      limit: request.limit,
      resetAt,
      retryAfterSeconds: Math.max(0, Math.ceil((resetAt - now) / 1000)),
      operationId: randomUUID(),
    };
  }

  async reset(key: string) {
    this.buckets.delete(key);
  }
  async healthCheck() {
    return true;
  }
  async getRemaining(request: RateLimitRequest) {
    return (await this.check(request)).remaining;
  }
}
import { randomUUID } from "node:crypto";
