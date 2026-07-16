import { z } from "zod";
import type { ProviderResult } from "../provider-types";

export const companySearchInputSchema = z.object({
  query: z.string().optional(),
  countryCode: z.string().length(2),
  industries: z.array(z.string()).default([]),
  employeeRange: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(25),
});
export type CompanySearchInput = z.infer<typeof companySearchInputSchema>;

export const companyRecordSchema = z.object({
  isMock: z.boolean(),
  id: z.string().min(1),
  name: z.string().min(1),
  countryCode: z.string().length(2),
  industry: z.string(),
  employeeRange: z.string(),
  website: z.string().url().optional(),
  enriched: z.boolean().default(false),
});
export type CompanyRecord = z.infer<typeof companyRecordSchema>;

export const companySearchPageSchema = z.object({
  items: z.array(companyRecordSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  isMock: z.boolean(),
});
export type CompanySearchPage = z.infer<typeof companySearchPageSchema>;

export const companyEnrichmentInputSchema = z.object({
  companyId: z.string().min(1),
  website: z.string().url().optional(),
});
export type CompanyEnrichmentInput = z.infer<typeof companyEnrichmentInputSchema>;

export const enrichedCompanySchema = companyRecordSchema.extend({
  enriched: z.literal(true),
  technologies: z.array(z.string()),
  buyingSignals: z.array(z.string()),
});
export type EnrichedCompany = z.infer<typeof enrichedCompanySchema>;

export const findDecisionMakersInputSchema = z.object({
  companyId: z.string().min(1),
  icpSummary: z.string().optional(),
});
export type FindDecisionMakersInput = z.infer<typeof findDecisionMakersInputSchema>;

export const decisionMakerRecommendationSchema = z.object({
  isMock: z.boolean(),
  companyId: z.string().min(1),
  recommendedRoles: z.array(z.string()).min(1),
  rationale: z.string(),
});
export type DecisionMakerRecommendation = z.infer<typeof decisionMakerRecommendationSchema>;

export interface LeadProvider {
  readonly name: string;
  readonly isMock: boolean;
  searchCompanies(input: CompanySearchInput): Promise<ProviderResult<CompanySearchPage>>;
  enrichCompany(input: CompanyEnrichmentInput): Promise<ProviderResult<EnrichedCompany>>;
  findDecisionMakers(
    input: FindDecisionMakersInput,
  ): Promise<ProviderResult<DecisionMakerRecommendation>>;
}
