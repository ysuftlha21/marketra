import { z } from "zod";

export const marketAnalysisInputSchema = z.object({
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  productName: z.string().min(1),
  productSummary: z.string(),
  coreProblem: z.string(),
  valueProposition: z.string(),
  capabilities: z.array(z.string()),
  customerCategories: z.array(z.string()),
  buyerRoles: z.array(z.string()),
  businessModelInterpretation: z.string().optional(),
  pricingPositionInterpretation: z.string().optional(),
  intelligenceSummary: z.string(),
  intelligenceBusinessEnv: z.string(),
  intelligenceDigitalAdoption: z.string(),
  intelligenceSaaSEnv: z.string(),
  intelligencePaymentExpectations: z.string(),
  intelligenceProcurementComplexity: z.string(),
  intelligenceRegulatory: z.string(),
  intelligenceDataProtection: z.string(),
  intelligenceLocalization: z.string(),
  intelligenceSalesCycle: z.string(),
  intelligenceChannels: z.string(),
  assumptions: z.record(z.string(), z.unknown()).optional().default({}),
});

export type MarketAnalysisInput = z.infer<typeof marketAnalysisInputSchema>;

export {
  entryRecommendationSchema,
  countryMarketAnalysisResultSchema,
  analysisConfidenceSchema,
} from "@/lib/providers/ai/ai.provider";
export type { CountryMarketAnalysisResult } from "@/lib/providers/ai/ai.provider";
export type { CountryMarketIntelligence } from "@/lib/providers/market/market.provider";
