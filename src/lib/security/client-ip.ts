import { isIP } from "node:net";
import { hashRateLimitIdentifier } from "./rate-limit-key";

function normalize(value: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim().replace(/^\[|\]$/g, "");
  return isIP(candidate) ? candidate.toLowerCase() : null;
}

export function getTrustedClientIp(headers: Headers): string | null {
  const vercelIp = normalize(headers.get("x-vercel-forwarded-for")?.split(",").at(-1) ?? null);
  if (vercelIp) return vercelIp;
  return normalize(headers.get("x-real-ip"));
}

export function getPrivacySafeClientIpScope(headers: Headers): string {
  const ip = getTrustedClientIp(headers);
  return ip ? hashRateLimitIdentifier(ip) : "unknown";
}
