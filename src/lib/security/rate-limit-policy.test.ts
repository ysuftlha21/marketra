import { describe, expect, it } from "vitest";
import { RateLimitProviderUnavailableError } from "@/lib/providers/rate-limit/rate-limit.provider";
import {
  FAIL_CLOSED_RATE_LIMIT_OPERATIONS,
  rateLimitHeaders,
  safeRateLimitMessage,
} from "./rate-limit-service";

describe("production rate-limit failure policy", () => {
  it.each([
    "signup",
    "product_analysis",
    "market_analysis",
    "company_discovery",
    "manual_company_creation",
    "decision_role_generation",
    "outreach_generation",
    "billing_checkout",
  ])("fails closed for sensitive operation %s", (operation) => {
    expect(FAIL_CLOSED_RATE_LIMIT_OPERATIONS.has(operation)).toBe(true);
  });
  it("maps provider outage without internal details", () => {
    expect(safeRateLimitMessage(new RateLimitProviderUnavailableError())).toMatch(
      /temporarily unavailable/i,
    );
  });
  it("creates standardized response headers", () => {
    expect(
      rateLimitHeaders({
        allowed: false,
        remaining: 0,
        limit: 5,
        resetAt: 10_000,
        retryAfterSeconds: 3,
        operationId: "safe",
      }),
    ).toEqual({
      "RateLimit-Limit": "5",
      "RateLimit-Remaining": "0",
      "RateLimit-Reset": "10",
      "Retry-After": "3",
    });
  });
});
