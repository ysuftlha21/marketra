import { z } from "zod";
import type { ProviderResult } from "../provider-types";

export const analyzeMarketInputSchema = z.object({
  countryCode: z.string().length(2),
  productSummary: z.string().min(1),
});
export type AnalyzeMarketInput = z.infer<typeof analyzeMarketInputSchema>;

export const marketAnalysisResultSchema = z.object({
  isMock: z.boolean(),
  countryCode: z.string().length(2),
  summary: z.string(),
  marketSizeEstimate: z.string(),
  isEstimate: z.boolean(),
  sources: z.array(
    z.object({
      url: z.string().url(),
      title: z.string(),
      retrievedAt: z.string(),
    }),
  ),
  trends: z.array(z.string()),
});
export type MarketAnalysisResult = z.infer<typeof marketAnalysisResultSchema>;

export const findCompetitorsInputSchema = z.object({
  countryCode: z.string().length(2),
  productSummary: z.string().min(1),
});
export type FindCompetitorsInput = z.infer<typeof findCompetitorsInputSchema>;

export const competitorSchema = z.object({
  isMock: z.boolean(),
  name: z.string().min(1),
  summary: z.string(),
  url: z.string().url().optional(),
});
export type Competitor = z.infer<typeof competitorSchema>;

export const recommendSegmentsInputSchema = z.object({
  countryCode: z.string().length(2),
  productSummary: z.string().min(1),
});
export type RecommendSegmentsInput = z.infer<typeof recommendSegmentsInputSchema>;

export const segmentRecommendationSchema = z.object({
  isMock: z.boolean(),
  segments: z.array(
    z.object({
      name: z.string(),
      fitReason: z.string(),
      estimatedConfidence: z.number().min(0).max(1),
    }),
  ),
});
export type SegmentRecommendation = z.infer<typeof segmentRecommendationSchema>;

export interface MarketIntelligenceProvider {
  readonly name: string;
  readonly isMock: boolean;
  analyzeMarket(input: AnalyzeMarketInput): Promise<ProviderResult<MarketAnalysisResult>>;
  findCompetitors(input: FindCompetitorsInput): Promise<ProviderResult<Competitor[]>>;
  recommendSegments(input: RecommendSegmentsInput): Promise<ProviderResult<SegmentRecommendation>>;
  getCountryMarketIntelligenceV1(
    input: CountryMarketIntelligenceInput,
  ): Promise<ProviderResult<CountryMarketIntelligence>>;
}

// ── V1 Country Market Intelligence ────────────────────────────────

export const countryMarketIntelligenceInputSchema = z.object({
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  region: z.string().optional(),
  currency: z.string().length(3).optional(),
  productSummary: z.string().min(1),
  productCategories: z.array(z.string()).optional().default([]),
  assumptions: z.record(z.string(), z.unknown()).optional().default({}),
});
export type CountryMarketIntelligenceInput = z.infer<typeof countryMarketIntelligenceInputSchema>;

export const sourceReferenceSchema = z.object({
  label: z.string(),
  kind: z.enum(["config", "mock", "provider"]),
  freshness: z.string().optional(),
});

export const countryMarketIntelligenceSchema = z.object({
  isMock: z.boolean(),
  countryCode: z.string().length(2),
  countryName: z.string(),
  region: z.string(),
  officialLanguages: z.array(z.string()),
  currency: z.string(),
  businessEnvironment: z.string(),
  digitalAdoption: z.string(),
  saasPurchasingEnvironment: z.string(),
  paymentExpectations: z.string(),
  procurementComplexity: z.string(),
  regulatoryConsiderations: z.string(),
  dataProtectionConsiderations: z.string(),
  localizationConsiderations: z.string(),
  salesCycleObservations: z.string(),
  channelObservations: z.string(),
  sources: z.array(sourceReferenceSchema),
  dataFreshnessDate: z.string(),
  limitations: z.array(z.string()),
  missingData: z.array(z.string()),
});
export type CountryMarketIntelligence = z.infer<typeof countryMarketIntelligenceSchema>;
