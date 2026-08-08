import { isProseString } from "./discovery-keywords";

type SubmittedState = "absent" | "empty" | "populated";

type SubmittedValue = {
  state?: SubmittedState;
  value?: unknown;
  values?: unknown;
};

export interface RestoredDiscoveryFilters {
  industry?: string;
  /**
   * Explicitly submitted keywords — undefined means the field was absent (never edited),
   * [] means the user cleared it, [...] means specific keywords were submitted.
   * Values are sanitized: prose strings from old ICP-signal snapshots are removed.
   */
  keywords?: string[];
  /**
   * Explicitly submitted technologies — same three-state semantics as keywords.
   * Only concrete recognized technology names survive restoration.
   */
  technologies?: string[];
  keywordMatchMode: "any" | "all";
  employeeMin?: number;
  employeeMax?: number;
  maxResults: number;
  page: number;
}

/**
 * Removes prose strings (qualificationSignals, purchaseTriggers, pains, etc.)
 * that may have been incorrectly persisted as keywords in legacy runs created
 * before commit f832926.  Concise short descriptors are preserved.
 */
function sanitizeRestoredKeywords(values: string[]): string[] {
  return values.filter((v) => v.trim().length > 0 && !isProseString(v));
}

/**
 * Rejects technology values that are descriptive prose rather than recognized
 * technology names.  Any value longer than 50 characters or matching sentence
 * patterns is dropped.  Conservative: keeps only values that look like product/
 * platform names (no internal spaces beyond a brand-name pair, no punctuation).
 */
function sanitizeRestoredTechnologies(values: string[]): string[] {
  return values.filter((v) => {
    const trimmed = v.trim();
    if (!trimmed || trimmed.length > 50) return false;
    if (/[.!?;:]/.test(trimmed)) return false;
    if (trimmed.split(/\s+/).length > 4) return false;
    return true;
  });
}

function restoredList(value: SubmittedValue | undefined): string[] | undefined {
  if (!value || value.state === "absent") return undefined;
  if (value.state === "empty") return [];
  if (value.state !== "populated" || !Array.isArray(value.values)) return undefined;
  return value.values.filter((item): item is string => typeof item === "string");
}

export function restoreSubmittedDiscoveryFilters(
  inputSnapshot: Record<string, unknown> | null | undefined,
): RestoredDiscoveryFilters | null {
  const raw = inputSnapshot?.submittedFilters;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const submitted = raw as Record<string, unknown>;
  const industryEntry = submitted.industry as SubmittedValue | undefined;
  const industry =
    industryEntry?.state === "empty"
      ? ""
      : industryEntry?.state === "populated" && typeof industryEntry.value === "string"
        ? industryEntry.value
        : undefined;
  const mode = submitted.keywordMatchMode === "all" ? "all" : "any";

  const rawKeywords = restoredList(submitted.keywords as SubmittedValue | undefined);
  const keywords =
    rawKeywords === undefined ? undefined : sanitizeRestoredKeywords(rawKeywords);

  const rawTechnologies = restoredList(submitted.technologies as SubmittedValue | undefined);
  const technologies =
    rawTechnologies === undefined ? undefined : sanitizeRestoredTechnologies(rawTechnologies);

  return {
    industry,
    keywords,
    technologies,
    keywordMatchMode: mode,
    employeeMin: typeof submitted.employeeMin === "number" ? submitted.employeeMin : undefined,
    employeeMax: typeof submitted.employeeMax === "number" ? submitted.employeeMax : undefined,
    maxResults:
      typeof submitted.resultCap === "number" && submitted.resultCap > 0 ? submitted.resultCap : 5,
    page: typeof submitted.page === "number" && submitted.page > 0 ? submitted.page : 1,
  };
}
