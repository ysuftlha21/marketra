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
      retryAfterSeconds: allowed ? null : Math.max(1, Math.ceil((bucket.resetsAt - now) / 1000)),
    };
  }
}
