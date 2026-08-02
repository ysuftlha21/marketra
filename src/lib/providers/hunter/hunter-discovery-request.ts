import type { CompanyDiscoveryInputV1 } from "../company-discovery/company-discovery.provider";

const HUNTER_HEADCOUNT_BUCKETS = [
  { value: "1-10", min: 1, max: 10 },
  { value: "11-50", min: 11, max: 50 },
  { value: "51-200", min: 51, max: 200 },
  { value: "201-500", min: 201, max: 500 },
  { value: "501-1000", min: 501, max: 1000 },
  { value: "1001-5000", min: 1001, max: 5000 },
  { value: "5001-10000", min: 5001, max: 10000 },
  { value: "10001+", min: 10001, max: Number.POSITIVE_INFINITY },
] as const;

const INDUSTRY_ALIASES: ReadonlyArray<[RegExp, string]> = [
  [/\bsaas\b|\bsoftware\b/i, "Software Development"],
  [/information technology|\bit services\b/i, "IT Services and IT Consulting"],
  [/financial services|\bfintech\b/i, "Financial Services"],
  [/marketing/i, "Marketing Services"],
  [/health care|healthcare/i, "Hospitals and Health Care"],
];

const TECHNOLOGY_ALIASES = new Map<string, string>([
  ["aws", "amazon-ec2"],
  ["amazon web services", "amazon-ec2"],
  ["hubspot", "hubspot"],
  ["react", "react-js"],
  ["react.js", "react-js"],
  ["salesforce", "salesforce"],
  ["wordpress", "wordpress"],
  ["shopify", "shopify"],
]);

function uniqueTrimmed(values: readonly string[] | undefined, maxLength = 80): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values ?? []) {
    const value = raw.trim().replace(/\s+/g, " ");
    const key = value.toLowerCase();
    if (!value || value.length > maxLength || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

export function normalizeHunterIndustries(values: readonly string[]): string[] {
  const normalized = uniqueTrimmed(values)
    .map((value) => INDUSTRY_ALIASES.find(([pattern]) => pattern.test(value))?.[1])
    .filter((value): value is string => Boolean(value));
  return [...new Set(normalized)];
}

export function normalizeHunterTechnologies(values: readonly string[]): string[] {
  return [
    ...new Set(
      uniqueTrimmed(values, 50)
        .map((value) => TECHNOLOGY_ALIASES.get(value.toLowerCase()))
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

export function hunterHeadcountBuckets(minimum?: number, maximum?: number): string[] {
  const min = minimum ?? 0;
  const max = maximum ?? Number.POSITIVE_INFINITY;
  return HUNTER_HEADCOUNT_BUCKETS.filter((bucket) => bucket.max >= min && bucket.min <= max).map(
    (bucket) => bucket.value,
  );
}

export function buildHunterDiscoverBody(input: CompanyDiscoveryInputV1): Record<string, unknown> {
  const country = input.targetCountryCode.trim().toUpperCase();
  const industries = normalizeHunterIndustries(input.industries);
  const technologies = normalizeHunterTechnologies(input.technologySignals);
  const keywords = uniqueTrimmed(input.keywords, 60);
  const headcount = hunterHeadcountBuckets(
    input.companySizeMinEmployees,
    input.companySizeMaxEmployees,
  );

  return {
    headquarters_location: { include: [{ country }] },
    ...(industries.length > 0 ? { industry: { include: industries } } : {}),
    ...(headcount.length > 0 && (input.companySizeMinEmployees || input.companySizeMaxEmployees)
      ? { headcount }
      : {}),
    ...(keywords.length > 0 ? { keywords: { include: keywords, match: "any" } } : {}),
    ...(technologies.length > 0 ? { technology: { include: technologies, match: "any" } } : {}),
  };
}
