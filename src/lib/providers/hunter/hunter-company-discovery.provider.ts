import { z } from "zod";
import { normalizeDomain } from "@/features/companies/domain/company-normalization";
import { buildMeta } from "../provider-types";
import type {
  CompanyDiscoveryInputV1,
  CompanyDiscoveryOutputV1,
  CompanyDiscoveryProvider,
  DiscoveryCompanyCandidate,
} from "../company-discovery/company-discovery.provider";
import type { HunterClient } from "./hunter-client";
import { HunterProviderError } from "./hunter-client";
import { buildHunterDiscoverBody } from "./hunter-discovery-request";

const discoverCompanySchema = z
  .object({
    domain: z.string().optional(),
    organization: z.string().optional(),
    name: z.string().optional(),
    emails_count: z
      .union([
        z.number().int().nonnegative(),
        z.object({ total: z.number().int().nonnegative().optional() }).passthrough(),
      ])
      .optional(),
  })
  .passthrough();
const discoverResponseSchema = z
  .object({
    data: z.array(discoverCompanySchema),
    meta: z.object({ results: z.number().int().nonnegative().optional() }).passthrough().optional(),
  })
  .passthrough();

const companyResponseSchema = z
  .object({
    data: z
      .object({
        name: z.string().optional(),
        domain: z.string().optional(),
        industry: z.string().optional(),
        description: z.string().optional(),
        headcount: z.number().int().nonnegative().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        technologies: z.array(z.string()).optional(),
      })
      .passthrough(),
  })
  .passthrough();

type CachedCompany = { expiresAt: number; value: z.infer<typeof companyResponseSchema>["data"] };

export class HunterCompanyDiscoveryProvider implements CompanyDiscoveryProvider {
  readonly id = "hunter" as const;
  readonly version = "1.0.0";
  private readonly enrichmentCache = new Map<string, CachedCompany>();

  constructor(
    private readonly client: HunterClient,
    private readonly now: () => number = Date.now,
    private readonly cacheTtlMs = 24 * 60 * 60 * 1000,
  ) {}

  async discoverCompaniesV1(input: CompanyDiscoveryInputV1) {
    const startedAt = Date.now();
    const body = buildHunterDiscoverBody(input);
    if ((input.offset ?? 0) > 0) {
      body.offset = input.offset;
      body.limit = Math.min(input.maxResults, 100);
    }
    const providerResponse = await this.client.request<unknown>("company_discovery", "/discover", {
      method: "POST",
      body,
    });
    const parsed = discoverResponseSchema.safeParse(providerResponse);
    if (!parsed.success) throw new HunterProviderError("invalid_response");
    const response = parsed.data;
    const raw = response.data;
    const seen = new Set<string>();
    const candidates: DiscoveryCompanyCandidate[] = [];
    for (const [index, company] of raw.entries()) {
      const domain = company.domain ? normalizeDomain(company.domain) : undefined;
      if (
        !domain ||
        seen.has(domain) ||
        input.exclusionDomains.map(normalizeDomain).includes(domain)
      )
        continue;
      seen.add(domain);
      const name = company.organization ?? company.name ?? domain;
      const emailCount =
        typeof company.emails_count === "number"
          ? company.emails_count
          : company.emails_count?.total;
      candidates.push({
        name,
        normalizedName: name
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, "")
          .trim(),
        primaryDomain: domain,
        normalizedDomain: domain,
        websiteUrl: `https://${domain}`,
        countryCode: input.targetCountryCode,
        industry: input.industries[0] ?? "Unknown",
        industryTags: input.industries,
        annualRevenueCurrency: "USD",
        technologySignals: [],
        growthSignals: [],
        sourceExternalId: domain,
        sourceUrl: `https://${domain}`,
        providerRank: index + 1,
        warnings: emailCount === 0 ? ["No public business emails reported by provider"] : [],
        dataQuality: company.organization ? "medium" : "low",
        fetchedAt: new Date(this.now()).toISOString(),
      });
    }
    const data: CompanyDiscoveryOutputV1 = {
      candidates: candidates.slice(0, input.maxResults),
      totalCount: response.meta?.results ?? candidates.length,
      warnings: [],
    };
    return { data, meta: buildMeta("hunter-company-discovery", false, startedAt) };
  }

  async enrichCompany(domainInput: string) {
    const domain = normalizeDomain(domainInput);
    if (!domain) throw new Error("A valid company domain is required.");
    const cached = this.enrichmentCache.get(domain);
    if (cached && cached.expiresAt > this.now()) return { ...cached.value, cached: true };
    const response = companyResponseSchema.parse(
      await this.client.request<unknown>("company_enrichment", "/companies/find", {
        query: { domain },
      }),
    );
    this.enrichmentCache.set(domain, {
      value: response.data,
      expiresAt: this.now() + this.cacheTtlMs,
    });
    return { ...response.data, cached: false };
  }
}
