import { z } from "zod";
import type { RateLimitProvider, RateLimitRequest } from "./rate-limit.provider";
import { RateLimitProviderUnavailableError } from "./rate-limit.provider";

const responseSchema = z.object({
  allowed: z.boolean(),
  remaining: z.number().int().nonnegative(),
  retryAfterSeconds: z.number().int().positive().nullable(),
});

export class ExternalRateLimitProvider implements RateLimitProvider {
  readonly id = "external";
  constructor(private readonly config: { url: string; token: string; timeoutMs: number }) {}

  async consume(request: RateLimitRequest) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
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
        if (!response.ok) throw new RateLimitProviderUnavailableError();
        const parsed = responseSchema.safeParse(await response.json());
        if (!parsed.success) throw new RateLimitProviderUnavailableError();
        return parsed.data;
      } catch {
        if (attempt === 1) throw new RateLimitProviderUnavailableError();
      } finally {
        clearTimeout(timer);
      }
    }
    throw new RateLimitProviderUnavailableError();
  }
}
