import net from "node:net";
import dns from "node:dns";

const METADATA_ENDPOINTS = new Set(["169.254.169.254", "fd00:ec2::254"]);

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_SIZE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

export type DnsResolver = {
  resolve4: (hostname: string) => Promise<string[]>;
  resolve6: (hostname: string) => Promise<string[]>;
};

const defaultDnsResolver: DnsResolver = {
  resolve4: (hostname) => dns.promises.resolve4(hostname).catch(() => []),
  resolve6: (hostname) => dns.promises.resolve6(hostname).catch(() => []),
};

function isPrivateIp(ip: string): boolean {
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized.startsWith("::ffff:")) return isPrivateIp(normalized.slice(7));
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("ff")
    );
  }

  if (ip === "127.0.0.1" || ip === "0.0.0.0") return true;
  if (METADATA_ENDPOINTS.has(ip)) return true;

  const parts = ip.split(".");
  if (parts.length !== 4) return false;

  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) return false;

  const first = nums[0] ?? 0;
  const second = nums[1] ?? 0;
  if (first === 10) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 100 && second >= 64 && second <= 127) return true;
  if (first === 169 && second === 254) return true;
  if (first >= 224) return true;

  return false;
}

/** Synchronous validation for URLs that are stored/displayed but never fetched. */
export function isSafeStoredUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(url.protocol)) return false;
  if (url.username || url.password) return false;
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname || hostname === "localhost") return false;
  if (
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  )
    return false;
  if (METADATA_ENDPOINTS.has(hostname)) return false;
  if (net.isIP(hostname) && isPrivateIp(hostname)) return false;
  return true;
}

/** Resolve a hostname to its IP addresses. Uses the provided resolver or real DNS. */
async function resolveHostname(
  hostname: string,
  resolver: DnsResolver = defaultDnsResolver,
): Promise<string[]> {
  const [v4, v6] = await Promise.all([resolver.resolve4(hostname), resolver.resolve6(hostname)]);
  return [...v4, ...v6];
}

/**
 * Check whether every resolved IP for the hostname is public.
 * Returns true when the target is safe to connect to.
 *
 * ⚠️ DNS-rebinding residual risk
 * There is a time-of-check/time-of-use gap between DNS resolution here and the
 * actual TCP connection made by `fetch()`. An attacker could change DNS records
 * between these two operations. In a serverless environment (Vercel) we cannot
 * pin the TCP connection to the resolved IP ourselves. Production deployments
 * should consider a sidecar or egress proxy for connection pinning.
 */
async function isHostnamePublic(
  hostname: string,
  resolver: DnsResolver = defaultDnsResolver,
): Promise<boolean> {
  const ips = await resolveHostname(hostname, resolver);
  if (ips.length === 0) {
    // No records found — reject; an empty DNS response is suspicious.
    return false;
  }
  // Normalise IPv4-mapped IPv6 (::ffff:x.x.x.x) to plain IPv4 for checking.
  return ips.every((ip) => {
    const normalised = ip.toLowerCase().replace(/^::ffff:/, "");
    return !isPrivateIp(normalised);
  });
}

/**
 * Validate a URL for SSRF safety.
 *
 * Returns true when the URL is safe to fetch.
 */
async function isSafeUrl(
  urlString: string,
  resolver: DnsResolver = defaultDnsResolver,
): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return false;
  if (hostname === "0.0.0.0") return false;

  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;

  // Literal IP — check directly.
  if (net.isIP(hostname)) {
    // Normalise IPv6 bracket notation.
    const clean = hostname.replace(/^\[|\]$/g, "");
    return !isPrivateIp(clean);
  }

  // Domain name — resolve DNS and check every returned IP.
  return isHostnamePublic(hostname, resolver);
}

async function safeFetch(
  urlString: string,
  redirectCount = 0,
  resolver: DnsResolver = defaultDnsResolver,
): Promise<{ text: string; contentType: string | null }> {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error("Too many redirects");
  }

  if (!(await isSafeUrl(urlString, resolver))) {
    throw new Error("Blocked: unsafe URL target");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(urlString, {
      method: "GET",
      signal: controller.signal,
      redirect: "manual",
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain",
      },
    });

    const { status } = response;
    if (status >= 300 && status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect without location header");

      const redirectTarget = new URL(location, urlString).toString();
      if (!(await isSafeUrl(redirectTarget, resolver))) {
        throw new Error("Blocked: redirect target is unsafe");
      }

      return safeFetch(redirectTarget, redirectCount + 1, resolver);
    }

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${status}`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number.parseInt(contentLength, 10) > MAX_RESPONSE_SIZE_BYTES) {
      throw new Error("Response exceeds size limit");
    }

    const contentType = response.headers.get("content-type");
    const text = await response.text();

    if (text.length > MAX_RESPONSE_SIZE_BYTES) {
      throw new Error("Response exceeds size limit");
    }

    return { text, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

export interface FetchProductWebsiteResult {
  text: string;
  contentType: string | null;
}

export async function fetchProductWebsite(
  urlString: string,
  resolver: DnsResolver = defaultDnsResolver,
): Promise<FetchProductWebsiteResult> {
  if (!(await isSafeUrl(urlString, resolver))) {
    throw new Error("Blocked: unsafe URL target");
  }

  return safeFetch(urlString, 0, resolver);
}

export { isSafeUrl, isPrivateIp, resolveHostname, isHostnamePublic };
