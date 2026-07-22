import type { RateLimitProvider } from "./rate-limit.provider";
import { MockRateLimitProvider } from "./mock-rate-limit.provider";
import { InMemoryRateLimitProvider } from "./in-memory-rate-limit.provider";
import { ExternalRateLimitProvider } from "./external-rate-limit.provider";

const memoryProvider = new InMemoryRateLimitProvider();

export function createRateLimitProvider(
  id: string,
  config?: { url?: string; token?: string; timeoutMs?: number },
): RateLimitProvider {
  if (id === "mock") return new MockRateLimitProvider();
  if (id === "memory") return memoryProvider;
  if (id === "external") {
    if (!config?.url || !config.token) {
      throw new Error("A durable external RateLimitProvider is not configured.");
    }
    return new ExternalRateLimitProvider({
      url: config.url,
      token: config.token,
      timeoutMs: config.timeoutMs ?? 3000,
    });
  }
  throw new Error(`Unknown rate-limit provider: ${id}`);
}
