import type { RateLimitProvider, RateLimitRequest } from "./rate-limit.provider";

export class MockRateLimitProvider implements RateLimitProvider {
  readonly id = "mock";
  constructor(private readonly now: () => number = () => 0) {}
  async consume(request: RateLimitRequest) {
    return {
      allowed: true,
      remaining: request.limit,
      limit: request.limit,
      resetAt: this.now() + request.windowMs,
      retryAfterSeconds: 0,
      operationId: "mock-rate-limit-operation",
    };
  }
  async check(request: RateLimitRequest) {
    return this.consume(request);
  }
  async healthCheck() {
    return true;
  }
  async getRemaining(request: RateLimitRequest) {
    return request.limit;
  }
}
