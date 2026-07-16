import type {
  AnalyzeMarketInput,
  Competitor,
  CountryMarketIntelligence,
  CountryMarketIntelligenceInput,
  FindCompetitorsInput,
  MarketAnalysisResult,
  MarketIntelligenceProvider,
  RecommendSegmentsInput,
  SegmentRecommendation,
} from "./market.provider";
import { buildMeta } from "../provider-types";

function meta(startedAt: number) {
  return {
    providerName: "mock-market",
    isMock: true,
    durationMs: Math.max(1, Date.now() - startedAt),
  };
}

export class MockMarketIntelligenceProvider implements MarketIntelligenceProvider {
  readonly name = "mock-market";
  readonly isMock = true;

  async analyzeMarket(input: AnalyzeMarketInput) {
    const startedAt = Date.now();
    const data: MarketAnalysisResult = {
      isMock: true,
      countryCode: input.countryCode.toUpperCase(),
      summary: `[mock] Local market summary for ${input.countryCode}.`,
      marketSizeEstimate: "[mock] ~$1.2B (placeholder)",
      isEstimate: true,
      sources: [
        {
          url: "https://example.com/market-report",
          title: "[mock] Example market report",
          retrievedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
        },
      ],
      trends: ["[mock] Cloud adoption rising", "[mock] Remote-first buyers"],
    };
    return { data, meta: meta(startedAt) };
  }

  async findCompetitors(_: FindCompetitorsInput) {
    const startedAt = Date.now();
    const data: Competitor[] = [
      { isMock: true, name: "[mock] Competitor A", summary: "[mock] Local competitor" },
      { isMock: true, name: "[mock] Competitor B", summary: "[mock] Adjacent tool" },
    ];
    return { data, meta: meta(startedAt) };
  }

  async recommendSegments(_: RecommendSegmentsInput) {
    const startedAt = Date.now();
    const data: SegmentRecommendation = {
      isMock: true,
      segments: [
        {
          name: "[mock] Mid-market SaaS",
          fitReason: "[mock] Budget and pain match",
          estimatedConfidence: 0.6,
        },
        {
          name: "[mock] Early-stage startups",
          fitReason: "[mock] Speed matters",
          estimatedConfidence: 0.4,
        },
      ],
    };
    return { data, meta: meta(startedAt) };
  }

  async getCountryMarketIntelligenceV1(input: CountryMarketIntelligenceInput) {
    const startedAt = Date.now();
    const id = input.countryCode.toUpperCase();
    const data: CountryMarketIntelligence = {
      isMock: true,
      countryCode: id,
      countryName: input.countryName,
      region: input.region ?? "unknown",
      officialLanguages: id === "DE" ? ["de"] : id === "FR" ? ["fr"] : ["en"],
      currency: input.currency ?? "USD",
      businessEnvironment: `[mock] ${input.countryName} has a mature business environment with established legal frameworks.`,
      digitalAdoption:
        "[mock] Digital adoption is moderate to high. Cloud and SaaS tools are widely accepted.",
      saasPurchasingEnvironment:
        "[mock] SaaS purchasing is typical via monthly or annual subscriptions. Self-serve and sales-assisted models both work.",
      paymentExpectations:
        "[mock] Credit card and bank transfer are standard. Invoicing is common for enterprise deals.",
      procurementComplexity:
        "[mock] Procurement is straightforward for deals under ~$10K ARR. Enterprise procurement may require security reviews.",
      regulatoryConsiderations:
        "[mock] Standard business regulations apply. No unusual licensing requirements for SaaS tools.",
      dataProtectionConsiderations:
        "[mock] Data protection regulations similar to GDPR expectations. Data residency may be preferred by enterprise buyers.",
      localizationConsiderations:
        input.countryCode === "DE"
          ? "[mock] German-language UI and support may increase conversion. English is common in tech but not universal."
          : "[mock] English is widely understood in business contexts. Full localization may not be required for initial entry.",
      salesCycleObservations:
        "[mock] Typical SaaS sales cycles range from 2 weeks (self-serve) to 3 months (enterprise).",
      channelObservations:
        "[mock] Direct sales, content marketing, and partner referrals are effective channels.",
      sources: [
        { label: "[mock] Marketra country catalog", kind: "config", freshness: "2026-01-01" },
        {
          label: "[mock] General business environment notes",
          kind: "mock",
          freshness: "2026-01-01",
        },
      ],
      dataFreshnessDate: "2026-01-01",
      limitations: [
        "[mock] No real-time economic data",
        "[mock] No verified market-size statistics",
        "[mock] No competitor-specific intelligence",
      ],
      missingData: [
        "[mock] Specific market size figures",
        "[mock] Competitor landscape",
        "[mock] Local tax implications",
      ],
    };
    return { data, meta: buildMeta(this.name, this.isMock, startedAt) };
  }
}
