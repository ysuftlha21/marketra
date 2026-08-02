import { z } from "zod";
import type { ProviderResult } from "../provider-types";

/**
 * AiProvider — the only place that knows which AI vendor/model is in use.
 * Services depend on this interface. Prompts are versioned; responses are validated.
 * Mock returns deterministic, clearly-marked mock data.
 */

// ── V1 product analysis input/output (used by Phase 3+) ──────────
export const v1ProductAnalysisInputSchema = z.object({
  schemaVersion: z.literal("v1").optional().default("v1"),
  productName: z.string().min(1),
  productDescription: z.string().min(1),
  websiteUrl: z.string().url().optional(),
  targetCustomerSummary: z.string().optional(),
  businessModel: z.string().optional(),
  pricingSummary: z.string().optional(),
  currentMarkets: z.array(z.string()).optional().default([]),
  preferredLanguage: z.string().length(2).default("en"),
  scrapedWebsiteText: z.string().optional(),
});
export type V1ProductAnalysisInput = z.infer<typeof v1ProductAnalysisInputSchema>;

export const analysisConfidenceSchema = z.enum(["low", "medium", "high"]);
const conciseAnalysisTextSchema = z.string().min(1).max(600);
const conciseAnalysisItemSchema = z.string().min(1).max(240);
const conciseAnalysisListSchema = z.array(conciseAnalysisItemSchema).max(5);

export const v1ProductAnalysisResultSchema = z.object({
  isMock: z.boolean(),
  productSummary: z.string().min(1),
  coreProblem: z.string().min(1),
  valueProposition: z.string().min(1),
  capabilities: z.array(z.string()),
  customerCategories: z.array(z.string()),
  buyerRoles: z.array(z.string()),
  userRoles: z.array(z.string()),
  businessModelInterpretation: z.string(),
  pricingPositionInterpretation: z.string(),
  purchaseTriggers: z.array(z.string()),
  adoptionBarriers: z.array(z.string()),
  maturityObservations: z.string(),
  differentiators: z.array(z.string()),
  unsupportedClaims: z.array(z.string()),
  missingInformation: z.array(z.string()),
  clarificationQuestions: z.array(z.string()),
  positioningStatement: z.string(),
  elevatorPitch: z.string(),
  confidence: analysisConfidenceSchema,
});
export type V1ProductAnalysisResult = z.infer<typeof v1ProductAnalysisResultSchema>;

// ── V2 Product Intelligence Analysis ───────────────────────────────────

export const v2ProductAnalysisInputSchema = v1ProductAnalysisInputSchema.extend({
  schemaVersion: z.literal("v2"),
  additionalContext: z.record(z.string(), z.string()).optional(),
  clarificationAnswers: z.record(z.string(), z.string()).optional(),
});
export type V2ProductAnalysisInput = z.infer<typeof v2ProductAnalysisInputSchema>;

export const clarificationQuestionSchema = z.object({
  key: z.string(),
  question: z.string(),
  category: z.string(),
  isRequired: z.boolean(),
});
export type ClarificationQuestion = z.infer<typeof clarificationQuestionSchema>;

export const v2ProductAnalysisResultSchema = z
  .object({
    schemaVersion: z.literal("v2"),
    isMock: z.boolean(),
    productCategory: conciseAnalysisTextSchema,
    targetCustomerSegments: conciseAnalysisListSchema,
    userPersonas: conciseAnalysisListSchema,
    buyerRoles: conciseAnalysisListSchema,
    primaryPainPoints: conciseAnalysisListSchema,
    jobsToBeDone: conciseAnalysisListSchema,
    keyCapabilities: conciseAnalysisListSchema,
    customerBenefits: conciseAnalysisListSchema,
    valueProposition: conciseAnalysisTextSchema,
    positioning: conciseAnalysisTextSchema,
    differentiators: conciseAnalysisListSchema,
    competitorCategories: conciseAnalysisListSchema,
    alternativesCustomersCurrentlyUse: conciseAnalysisListSchema,
    businessModel: conciseAnalysisTextSchema,
    pricingInterpretation: conciseAnalysisTextSchema,
    purchaseTriggers: conciseAnalysisListSchema,
    likelyObjections: conciseAnalysisListSchema,
    adoptionBarriers: conciseAnalysisListSchema,
    useCases: conciseAnalysisListSchema,
    strengths: conciseAnalysisListSchema,
    weaknesses: conciseAnalysisListSchema,
    risks: conciseAnalysisListSchema,
    assumptions: conciseAnalysisListSchema,
    evidenceExtractedFromWebsite: conciseAnalysisListSchema,
    sectionConfidences: z
      .object({
        productCategory: analysisConfidenceSchema,
        targetCustomerSegments: analysisConfidenceSchema,
        valueProposition: analysisConfidenceSchema,
      })
      .strict(),
    missingInformation: conciseAnalysisListSchema,
    clarificationQuestions: z.array(clarificationQuestionSchema.strict()).max(5),
    confidence: analysisConfidenceSchema,
  })
  .strict();
export type V2ProductAnalysisResult = z.infer<typeof v2ProductAnalysisResultSchema>;

export const productAnalysisResultAnySchema = z.discriminatedUnion("schemaVersion", [
  v1ProductAnalysisResultSchema.extend({ schemaVersion: z.literal("v1").default("v1") }),
  v2ProductAnalysisResultSchema,
]);
export type ProductAnalysisResultAny = z.infer<typeof productAnalysisResultAnySchema>;

// ── Legacy product analysis (kept for backward compat) ──────────
export const productAnalysisInputSchema = z.object({
  productName: z.string().min(1),
  websiteUrl: z.string().url(),
  summary: z.string().optional(),
});
export type ProductAnalysisInput = z.infer<typeof productAnalysisInputSchema>;

export const productAnalysisResultSchema = z.object({
  isMock: z.boolean(),
  productSummary: z.string(),
  valueProposition: z.string(),
  suggestedVerticals: z.array(z.string()),
  suggestedPainPoints: z.array(z.string()),
  suggestedTechnologies: z.array(z.string()),
});
export type ProductAnalysisResult = z.infer<typeof productAnalysisResultSchema>;

export const icpGenerationInputSchema = z.object({
  productName: z.string().min(1),
  productSummary: z.string().min(1),
  countryCode: z.string().length(2),
  constraints: z.string().optional(),
});
export type IcpGenerationInput = z.infer<typeof icpGenerationInputSchema>;

export const icpProfileSchema = z.object({
  isMock: z.boolean(),
  countryCode: z.string().length(2),
  industryFit: z.array(z.string()),
  employeeRange: z.string(),
  companyType: z.string(),
  painPoints: z.array(z.string()),
  technologySignals: z.array(z.string()),
  buyingSignals: z.array(z.string()),
});
export type IcpProfile = z.infer<typeof icpProfileSchema>;

export const evaluateCompanyInputSchema = z.object({
  companyName: z.string().min(1),
  companyCountryCode: z.string().length(2),
  icp: icpProfileSchema,
});
export type EvaluateCompanyInput = z.infer<typeof evaluateCompanyInputSchema>;

export const matchExplanationSchema = z.object({
  isMock: z.boolean(),
  positiveReasons: z.array(z.string()),
  negativeReasons: z.array(z.string()),
  missingData: z.array(z.string()),
  narrative: z.string(),
});
export type MatchExplanation = z.infer<typeof matchExplanationSchema>;

export const outreachInputSchema = z.object({
  companyName: z.string().min(1),
  language: z.enum(["en", "de", "fr", "es", "it", "nl", "pt", "pt-BR", "tr", "ja"]),
  recipientRole: z.string().min(1),
  context: z.string().optional(),
});
export type OutreachInput = z.infer<typeof outreachInputSchema>;

export const outreachContentSchema = z.object({
  isMock: z.boolean(),
  language: z.string(),
  subject: z.string(),
  body: z.string(),
});
export type OutreachContent = z.infer<typeof outreachContentSchema>;

export interface AiProvider {
  readonly name: string;
  readonly isMock: boolean;
  analyzeProduct(input: ProductAnalysisInput): Promise<ProviderResult<ProductAnalysisResult>>;
  analyzeProductV1(input: V1ProductAnalysisInput): Promise<ProviderResult<V1ProductAnalysisResult>>;
  analyzeProductV2(input: V2ProductAnalysisInput): Promise<ProviderResult<V2ProductAnalysisResult>>;
  generateIcp(input: IcpGenerationInput): Promise<ProviderResult<IcpProfile>>;
  evaluateCompany(input: EvaluateCompanyInput): Promise<ProviderResult<MatchExplanation>>;
  generateOutreach(input: OutreachInput): Promise<ProviderResult<OutreachContent>>;
  analyzeCountryMarketV1(
    input: CountryMarketAnalysisInput,
  ): Promise<ProviderResult<CountryMarketAnalysisResult>>;
  generateCountrySpecificIcpV1(
    input: CountrySpecificIcpInput,
  ): Promise<ProviderResult<CountrySpecificIcpResult>>;
}

// ── V1 Country Market Analysis (AI synthesis) ─────────────────────

export const entryRecommendationSchema = z.enum(["pursue", "investigate", "deprioritize"]);

export const countryMarketAnalysisInputSchema = z.object({
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  productName: z.string().min(1),
  productSummary: z.string().min(1),
  coreProblem: z.string(),
  valueProposition: z.string(),
  capabilities: z.array(z.string()),
  customerCategories: z.array(z.string()),
  buyerRoles: z.array(z.string()),
  businessModelInterpretation: z.string(),
  pricingPositionInterpretation: z.string(),
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
export type CountryMarketAnalysisInput = z.infer<typeof countryMarketAnalysisInputSchema>;

export const countryMarketAnalysisResultSchema = z.object({
  isMock: z.boolean(),
  countryCode: z.string().length(2),
  executiveSummary: z.string(),
  productCountryFit: z.string(),
  strongestFitSignals: z.array(z.string()),
  weakestFitSignals: z.array(z.string()),
  relevantCustomerSegments: z.array(z.string()),
  likelyBuyerRoles: z.array(z.string()),
  localizationRequirements: z.string(),
  languageConsiderations: z.string(),
  pricingConsiderations: z.string(),
  paymentProcurementConsiderations: z.string(),
  salesCycleExpectations: z.string(),
  preferredEntryMotions: z.array(z.string()),
  likelyAcquisitionChannels: z.array(z.string()),
  adoptionBarriers: z.array(z.string()),
  regulatoryConsiderations: z.string(),
  dataProtectionConsiderations: z.string(),
  operationalChallenges: z.array(z.string()),
  assumptionsUsed: z.array(z.string()),
  unresolvedQuestions: z.array(z.string()),
  validationExperiments: z.array(z.string()),
  entryRecommendation: entryRecommendationSchema,
  confidence: analysisConfidenceSchema,
  evidenceLimitations: z.array(z.string()),
});
export type CountryMarketAnalysisResult = z.infer<typeof countryMarketAnalysisResultSchema>;

// ── V1 Country-specific ICP ──────────────────────────────────────

export const industrySegmentSchema = z.object({
  name: z.string().min(1),
  fit: z.enum(["primary", "secondary", "niche"]),
  reasoning: z.string().min(1),
});
export const companyAttributeSchema = z.object({
  employeeRange: z.string(),
  maturity: z.string(),
  operatingModel: z.string(),
  geographicPresence: z.string(),
  digitalMaturity: z.string(),
  technologyMaturity: z.string(),
  buyingReadiness: z.string(),
});
export const icpBuyerRoleSchema = z.object({
  title: z.string(),
  department: z.string(),
  seniority: z.string(),
  roleInPurchase: z.string(),
  keyConcerns: z.array(z.string()),
  successMetrics: z.array(z.string()),
  influenceLevel: z.string(),
});
export const icpUserRoleSchema = z.object({
  title: z.string(),
  dailyWorkflow: z.string(),
  mainPains: z.array(z.string()),
  desiredOutcomes: z.array(z.string()),
  adoptionConcerns: z.string(),
});
export const icpObjectionSchema = z.object({
  objection: z.string(),
  underlyingConcern: z.string(),
  evidenceNeeded: z.string(),
});

export const countrySpecificIcpInputSchema = z.object({
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  productName: z.string().min(1),
  productDescription: z.string(),
  productSummary: z.string(),
  coreProblem: z.string(),
  valueProposition: z.string(),
  capabilities: z.array(z.string()),
  customerCategories: z.array(z.string()),
  buyerRoles: z.array(z.string()),
  userRoles: z.array(z.string()),
  adoptionBarriers: z.array(z.string()),
  purchaseTriggers: z.array(z.string()),
  marketRecommendation: z.string(),
  marketConfidence: z.string(),
  strongestFitSignals: z.array(z.string()),
  weakestFitSignals: z.array(z.string()),
  relevantCustomerSegments: z.array(z.string()),
  localizationRequirements: z.string(),
  acquisitionChannels: z.array(z.string()),
  regulatoryConsiderations: z.string(),
  operationalChallenges: z.array(z.string()),
  unresolvedQuestions: z.array(z.string()),
  countryRegion: z.string(),
  businessModel: z.string().optional(),
  pricingSummary: z.string().optional(),
});
export type CountrySpecificIcpInput = z.infer<typeof countrySpecificIcpInputSchema>;

export const countrySpecificIcpResultSchema = z.object({
  schemaVersion: z.literal("1"),
  isMock: z.boolean(),
  profileName: z.string().min(1),
  summary: z.string().min(1),
  countryCode: z.string().length(2),
  countryName: z.string().min(1),
  primaryIndustries: z.array(industrySegmentSchema),
  secondaryIndustries: z.array(industrySegmentSchema),
  excludedIndustries: z.array(z.string()),
  nicheSegments: z.array(z.string()),
  companyAttributes: companyAttributeSchema,
  buyerRoles: z.array(icpBuyerRoleSchema),
  userRoles: z.array(icpUserRoleSchema),
  primaryPains: z.array(z.string()),
  secondaryPains: z.array(z.string()),
  desiredBusinessOutcomes: z.array(z.string()),
  desiredOperationalOutcomes: z.array(z.string()),
  purchaseTriggers: z.array(z.string()),
  qualificationSignals: z.array(z.string()),
  disqualificationSignals: z.array(z.string()),
  objections: z.array(icpObjectionSchema),
  technologyContext: z.string().nullable(),
  procurementContext: z.string().nullable(),
  localizationRequirements: z.string().nullable(),
  assumptions: z.array(z.string()),
  missingInformation: z.array(z.string()),
  validationQuestions: z.array(z.string()),
  confidence: analysisConfidenceSchema,
  confidenceReason: z.string().min(1),
});
export type CountrySpecificIcpResult = z.infer<typeof countrySpecificIcpResultSchema>;

export { buildMeta } from "../provider-types";
