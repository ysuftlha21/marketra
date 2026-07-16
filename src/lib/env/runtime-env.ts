/** Helpers for reading validated runtime env without throwing during build of non-auth pages. */

function raw(key: string): string | undefined {
  return process.env[key];
}

/**
 * NEXT_PUBLIC_APP_URL normalized. Falls back to localhost for dev when unset.
 * Exported as a const-like value for tree-shaking; never null.
 */
export const NEXT_PUBLIC_APP_URL: string =
  raw("NEXT_PUBLIC_APP_URL") && raw("NEXT_PUBLIC_APP_URL")!.startsWith("http")
    ? raw("NEXT_PUBLIC_APP_URL")!
    : "http://localhost:3000";

export function getPublicAppUrl(): string {
  return NEXT_PUBLIC_APP_URL;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(raw("NEXT_PUBLIC_SUPABASE_URL") && raw("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
}

export function getSupabaseUrl(): string | undefined {
  return raw("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string | undefined {
  return raw("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}
