import type {
  CompanyEnrichmentInput,
  CompanySearchInput,
  CompanySearchPage,
  DecisionMakerRecommendation,
  EnrichedCompany,
  FindDecisionMakersInput,
  LeadProvider,
} from "./lead.provider";

const MOCK_COMPANIES_BASE = [
  { name: "Northbeam Labs", industry: "B2B SaaS", employeeRange: "11-50" },
  { name: "Tide Analytics", industry: "Developer tools", employeeRange: "51-200" },
  { name: "Vellum Cloud", industry: "Productivity", employeeRange: "1-10" },
] as const;

function buildMockPage(input: CompanySearchInput): CompanySearchPage {
  const items = MOCK_COMPANIES_BASE.map((base, i) => ({
    isMock: true,
    id: `mock-${input.countryCode}-${i + 1}`,
    name: base.name,
    countryCode: input.countryCode.toUpperCase(),
    industry: base.industry,
    employeeRange: base.employeeRange,
    website: `https://example.com/${input.countryCode.toLowerCase()}-${i + 1}`,
    enriched: false,
  }));
  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    total: items.length,
    isMock: true,
  };
}

export class MockLeadProvider implements LeadProvider {
  readonly name = "mock-leads";
  readonly isMock = true;

  async searchCompanies(input: CompanySearchInput) {
    const startedAt = Date.now();
    const data = buildMockPage(input);
    return { data, meta: this.meta(startedAt) };
  }

  async enrichCompany(input: CompanyEnrichmentInput) {
    const startedAt = Date.now();
    const data: EnrichedCompany = {
      isMock: true,
      id: input.companyId,
      name: "[mock] Enriched Company",
      countryCode: "US",
      industry: "B2B SaaS",
      employeeRange: "11-50",
      website: input.website ?? "https://example.com",
      enriched: true,
      technologies: ["Next.js", "Supabase"],
      buyingSignals: ["Hiring", "Recent funding"],
    };
    return { data, meta: this.meta(startedAt) };
  }

  async findDecisionMakers(input: FindDecisionMakersInput) {
    const startedAt = Date.now();
    const data: DecisionMakerRecommendation = {
      isMock: true,
      companyId: input.companyId,
      recommendedRoles: ["VP of Sales", "Head of Growth"],
      rationale: "[mock] Role recommendation from the ICP; not personal contact data.",
    };
    return { data, meta: this.meta(startedAt) };
  }

  private meta(startedAt: number) {
    return {
      providerName: this.name,
      isMock: this.isMock,
      durationMs: Math.max(1, Date.now() - startedAt),
    };
  }
}
