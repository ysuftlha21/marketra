import { createRateLimitProvider } from "@/lib/providers/rate-limit/rate-limit.factory";

export type ReadinessResult = { ready: boolean };

export async function checkReadiness(
  env: {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    DEFAULT_RATE_LIMIT_PROVIDER?: "mock" | "memory" | "redis";
    RATE_LIMIT_REDIS_URL?: string;
    RATE_LIMIT_REDIS_TOKEN?: string;
    RATE_LIMIT_REQUEST_TIMEOUT_MS?: number;
    APP_ENV?: string;
  },
  fetcher: typeof fetch = fetch,
): Promise<ReadinessResult> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { ready: false };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetcher(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return { ready: false };
    if (env.APP_ENV === "production" && env.DEFAULT_RATE_LIMIT_PROVIDER === "memory")
      return { ready: false };
    const rateLimiter = createRateLimitProvider(env.DEFAULT_RATE_LIMIT_PROVIDER ?? "mock", {
      url: env.RATE_LIMIT_REDIS_URL,
      token: env.RATE_LIMIT_REDIS_TOKEN,
      timeoutMs: env.RATE_LIMIT_REQUEST_TIMEOUT_MS,
    });
    return { ready: await rateLimiter.healthCheck() };
  } catch {
    return { ready: false };
  } finally {
    clearTimeout(timeout);
  }
}
