export interface NormalizationInput {
  name: string;
  domain?: string;
  websiteUrl?: string;
}

export interface NormalizationOutput {
  normalizedName: string;
  primaryDomain: string | null;
  normalizedDomain: string | null;
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

function stripWww(host: string): string {
  return host.replace(/^www\./i, "");
}

function stripPath(host: string): string {
  return (host.split("/")[0] ?? "").split("?")[0] ?? "";
}

export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const cleaned = stripPath(stripWww(stripProtocol(raw.trim())));
    if (!cleaned.includes(".")) return null;
    return cleaned.toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeCompanyName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\-'.&]/g, "")
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|gmbh|bv|nv|sa|pty|co|plc)\b\.?$/i, "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeCompany(input: NormalizationInput): NormalizationOutput {
  const normalizedDomain = normalizeDomain(input.domain ?? input.websiteUrl);
  const primaryDomain = normalizedDomain ? (input.domain ?? input.websiteUrl ?? null) : null;

  return {
    normalizedName: normalizeCompanyName(input.name),
    primaryDomain,
    normalizedDomain,
  };
}

export function isDuplicateCandidate(
  existingDomain: string | null,
  incomingDomain: string | null,
  existingName: string,
  incomingName: string,
): boolean {
  if (existingDomain && incomingDomain && existingDomain === incomingDomain) {
    return true;
  }
  const normExisting = normalizeCompanyName(existingName);
  const normIncoming = normalizeCompanyName(incomingName);
  return normExisting === normIncoming && normExisting.length > 2;
}
