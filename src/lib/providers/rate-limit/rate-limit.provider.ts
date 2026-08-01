import { z } from "zod";

export const rateLimitRequestSchema = z.object({
  key: z.string().min(1).max(500),
  limit: z.number().int().positive(),
  windowMs: z.number().int().positive(),
});
export type RateLimitRequest = z.infer<typeof rateLimitRequestSchema>;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterSeconds: number;
  operationId: string;
}

export interface RateLimitProvider {
  readonly id: string;
  consume(request: RateLimitRequest): Promise<RateLimitResult>;
  check(request: RateLimitRequest): Promise<RateLimitResult>;
  reset?(key: string): Promise<void>;
  healthCheck(): Promise<boolean>;
  diagnoseHealth?(): Promise<void>;
  getRemaining?(request: RateLimitRequest): Promise<number>;
}

export type RateLimitProviderFailureReason =
  "auth_failed" | "command_unsupported" | "connectivity_failed" | "response_invalid" | "timeout";

export class RateLimitExceededError extends Error {
  constructor(readonly result: RateLimitResult) {
    super("Too many requests. Please wait and try again.");
    this.name = "RateLimitExceededError";
  }

  get retryAfterSeconds() {
    return this.result.retryAfterSeconds;
  }
}

export class RateLimitProviderUnavailableError extends Error {
  constructor(readonly reason: RateLimitProviderFailureReason = "connectivity_failed") {
    super("Request protection is temporarily unavailable.");
    this.name = "RateLimitProviderUnavailableError";
  }
}
