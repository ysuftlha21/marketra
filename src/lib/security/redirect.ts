import { NEXT_PUBLIC_APP_URL } from "@/lib/env/runtime-env";

const ALLOWED_REDIRECT_HOSTS = new Set(["localhost"]);

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
    if (ALLOWED_REDIRECT_HOSTS.has(target.hostname))
      return target.pathname + target.search + target.hash;
    return fallback;
  } catch {
    return fallback;
  }
}
