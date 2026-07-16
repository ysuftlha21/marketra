import type {
  CompanyDiscoveryProvider,
  CompanyDiscoveryInputV1,
  CompanyDiscoveryOutputV1,
  DiscoveryCompanyCandidate,
} from "./company-discovery.provider";
import { companyDiscoveryOutputV1Schema } from "./company-discovery.provider";
import { buildMeta } from "../provider-types";

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function deterministicChoice<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}

function deterministicInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function deterministicSublist<T>(rng: () => number, items: T[], maxCount: number): T[] {
  const count = Math.min(maxCount, Math.floor(rng() * items.length) + 1);
  const shuffled = [...items].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

const INDUSTRIES = [
  "SaaS",
  "Fintech",
  "HealthTech",
  "EdTech",
  "Logistics",
  "E-Commerce",
  "Real Estate",
  "Cybersecurity",
  "LegalTech",
  "HR Tech",
];

const COMPANY_TYPES = ["private", "public", "nonprofit", "government"];

const TECH_SIGNALS = [
  "React",
  "Node.js",
  "Python",
  "AWS",
  "Kubernetes",
  "PostgreSQL",
  "Redis",
  "Docker",
  "GraphQL",
  "TensorFlow",
];

const GROWTH_SIGNALS = ["hiring", "funding", "expansion", "partnership", "new_product"];

const COMPANY_NAMES = [
  "Altus Technologies",
  "Bridgelight Systems",
  "Cortexa Analytics",
  "Deepfield Robotics",
  "Elysian Cloud",
  "FusionGrid Software",
  "Graviton Data",
  "Helios Digital",
  "Incepta Solutions",
  "Juniper Networks",
  "Kinetic Labs",
  "Lumina Research",
  "Meridian Software",
  "Nextera Global",
  "Orion Stack",
  "PulsePoint Systems",
  "Quantum Reach",
  "Radiant Core",
  "Stratum AI",
  "TerraForm Logic",
  "Unify Digital",
  "Vertexon Technologies",
  "WaveSync Labs",
  "Xenith Partners",
  "ZenithStack",
  "Apexa Dynamics",
  "BlueRidge Tech",
  "Cirrus Logic",
  "DawnBreak Solutions",
  "Ember Technologies",
];

const CITIES = [
  "San Francisco",
  "New York",
  "London",
  "Berlin",
  "Singapore",
  "Tokyo",
  "Toronto",
  "Sydney",
  "Amsterdam",
  "Dublin",
];

function generateCandidate(
  rng: () => number,
  index: number,
  input: CompanyDiscoveryInputV1,
): DiscoveryCompanyCandidate {
  const name = COMPANY_NAMES[index % COMPANY_NAMES.length];
  const suffix =
    index >= COMPANY_NAMES.length
      ? ` ${String.fromCharCode(65 + (index - COMPANY_NAMES.length))}`
      : "";
  const fullName = `${name}${suffix}`;
  const domain = fullName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
  const industry =
    input.industries.length > 0
      ? deterministicChoice(rng, input.industries)
      : deterministicChoice(rng, INDUSTRIES);
  const employeeMin = input.companySizeMinEmployees ?? deterministicInt(rng, 10, 50);
  const employeeMax = input.companySizeMaxEmployees ?? employeeMin + deterministicInt(rng, 10, 200);
  const revenueMin = input.revenueMinUsd ?? deterministicInt(rng, 1, 10) * 1_000_000;
  const revenueMax = input.revenueMaxUsd ?? revenueMin + deterministicInt(rng, 1, 50) * 1_000_000;
  const isDisqualified = index % 7 === 3;
  const isStrongFit = index % 7 === 0;
  const isNoDomain = index % 13 === 0;

  const techSignals = isDisqualified ? [] : deterministicSublist(rng, TECH_SIGNALS, 4);
  const growthSignals = isStrongFit ? deterministicSublist(rng, GROWTH_SIGNALS, 3) : [];

  return {
    name: fullName,
    normalizedName: fullName
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .trim(),
    ...(isNoDomain
      ? {}
      : {
          primaryDomain: domain,
          normalizedDomain: domain.toLowerCase().replace(/^www\./, ""),
          websiteUrl: `https://www.${domain}`,
        }),
    countryCode: input.targetCountryCode,
    headquartersCity: deterministicChoice(rng, CITIES),
    industry,
    industryTags: [industry],
    employeeCountMin: employeeMin,
    employeeCountMax: employeeMax,
    employeeCountEstimate: Math.round((employeeMin + employeeMax) / 2),
    annualRevenueMin: revenueMin,
    annualRevenueMax: revenueMax,
    annualRevenueCurrency: "USD",
    companyType: deterministicChoice(rng, COMPANY_TYPES),
    foundedYear: deterministicInt(rng, 2005, 2023),
    technologySignals: techSignals,
    growthSignals,
    sourceExternalId: `mock-${input.targetCountryCode}-${index}`,
    sourceUrl: `https://example.com/company/${domain}`,
    providerRank: index + 1,
    warnings: isNoDomain ? ["No domain available"] : [],
  };
}

export class MockCompanyDiscoveryProvider implements CompanyDiscoveryProvider {
  readonly id = "mock" as const;
  readonly version = "0.1.0";

  async discoverCompaniesV1(
    input: CompanyDiscoveryInputV1,
  ): Promise<{ data: CompanyDiscoveryOutputV1; meta: ReturnType<typeof buildMeta> }> {
    const startedAt = Date.now();
    const seed = input.correlationId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const rng = seededRandom(seed);

    const totalCandidates = Math.min(input.maxResults, 30);
    const candidates: DiscoveryCompanyCandidate[] = [];

    for (let i = 0; i < totalCandidates; i++) {
      candidates.push(generateCandidate(rng, i, input));
    }

    const data = companyDiscoveryOutputV1Schema.parse({
      candidates,
      totalCount: totalCandidates,
      warnings: [],
    });

    return { data, meta: buildMeta("mock-company-discovery", true, startedAt) };
  }
}
