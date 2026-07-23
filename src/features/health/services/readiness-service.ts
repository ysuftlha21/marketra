export type ReadinessResult = { ready: boolean };

export async function checkReadiness(
  env: { NEXT_PUBLIC_SUPABASE_URL?: string; NEXT_PUBLIC_SUPABASE_ANON_KEY?: string },
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
    return { ready: response.ok };
  } catch {
    return { ready: false };
  } finally {
    clearTimeout(timeout);
  }
}
