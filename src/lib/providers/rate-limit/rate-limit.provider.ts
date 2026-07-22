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
  retryAfterSeconds: number | null;
}

export interface RateLimitProvider {
  readonly id: string;
  consume(request: RateLimitRequest): Promise<RateLimitResult>;
}

export class RateLimitExceededError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Too many requests. Please wait and try again.");
    this.name = "RateLimitExceededError";
  }
}
