const MAX_KEYWORD_LENGTH = 40;
const MAX_KEYWORD_WORDS = 4;
const MAX_KEYWORDS = 8;

/**

 * Returns true when the string looks like a descriptive sentence rather than a
 * concise company-category keyword.  Qualifications signals, purchase triggers,
 * pains, assumptions, and reasoning paragraphs all fail this test and must never
 * reach a provider's keyword filter.
 */
export function isProseString(value: string): boolean {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return false;
  const wordCount = normalized.split(" ").filter(Boolean).length;
  return (
    normalized.length > MAX_KEYWORD_LENGTH ||
    wordCount > MAX_KEYWORD_WORDS ||
    /[.!?;:]$/.test(normalized)
  );
}

export function normalizeDiscoveryKeywords(values: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const raw of values ?? []) {
    const value = raw.trim().replace(/\s+/g, " ");
    const key = value.toLowerCase();
    if (!value || isProseString(value) || seen.has(key) || keywords.length >= MAX_KEYWORDS)
      continue;
    seen.add(key);
    keywords.push(value);
  }
  return keywords;
}

export function deriveDiscoveryKeywords(input: {
  industries?: readonly string[];
  productCategory?: string;
  companyTypes?: readonly string[];
  userTerms?: readonly string[];
}): string[] {
  return normalizeDiscoveryKeywords([
    ...(input.industries ?? []),
    ...(input.productCategory ? [input.productCategory] : []),
    ...(input.companyTypes ?? []),
    ...(input.userTerms ?? []),
  ]);
}
