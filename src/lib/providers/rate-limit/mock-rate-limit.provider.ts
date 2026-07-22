import type { RateLimitProvider, RateLimitRequest } from "./rate-limit.provider";

export class MockRateLimitProvider implements RateLimitProvider {
  readonly id = "mock";
  async consume(request: RateLimitRequest) {
    return { allowed: true, remaining: request.limit, retryAfterSeconds: null };
  }
}
