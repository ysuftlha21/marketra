import { NEXT_PUBLIC_APP_URL } from "@/lib/env/runtime-env";

function isSameOrigin(url: URL): boolean {
  if (typeof NEXT_PUBLIC_APP_URL !== "string") return false;
  try {
    const appUrl = new URL(NEXT_PUBLIC_APP_URL);
    return url.origin === appUrl.origin;
  } catch {
    return false;
  }
}

export function sanitizeRedirect(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  try {
    const target = new URL(next, NEXT_PUBLIC_APP_URL ?? "http://localhost");
    if (isSameOrigin(target)) return target.pathname + target.search + target.hash;
    return fallback;
  } catch {
    return fallback;
  }
}

const AUTH_CALLBACK_PATHS = new Set(["/dashboard", "/onboarding", "/reset-password"]);

export function sanitizeAuthCallbackRedirect(
  next: string | null | undefined,
  fallback = "/dashboard",
): string {
  const localPath = sanitizeRedirect(next, fallback);
  return AUTH_CALLBACK_PATHS.has(localPath) ? localPath : fallback;
}
