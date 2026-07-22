import { z } from "zod";
import type { RateLimitProvider, RateLimitRequest } from "./rate-limit.provider";

const responseSchema = z.object({
  allowed: z.boolean(),
  remaining: z.number().int().nonnegative(),
  retryAfterSeconds: z.number().int().positive().nullable(),
});

export class ExternalRateLimitProvider implements RateLimitProvider {
  readonly id = "external";
  constructor(private readonly config: { url: string; token: string; timeoutMs: number }) {}

  async consume(request: RateLimitRequest) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.token}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Rate-limit provider is unavailable.");
      const parsed = responseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("Rate-limit provider returned an invalid response.");
      return parsed.data;
    } catch {
      throw new Error("Rate-limit provider is unavailable.");
    } finally {
      clearTimeout(timer);
    }
  }
}
