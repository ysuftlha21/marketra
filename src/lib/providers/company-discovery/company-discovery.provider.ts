import { z } from "zod";
import type { ProviderResult } from "../provider-types";

export const companyDiscoveryProviderIdSchema = z.enum(["mock", "external", "hunter"]);
export type CompanyDiscoveryProviderId = z.infer<typeof companyDiscoveryProviderIdSchema>;

export const discoveryCompanyCandidateSchema = z.object({
  name: z.string().min(1),
  normalizedName: z.string().min(1),
  primaryDomain: z.string().optional(),
  normalizedDomain: z.string().optional(),
  websiteUrl: z.string().optional(),
  countryCode: z.string().length(2),
  headquartersCity: z.string().optional(),
  industry: z.string(),
  industryTags: z.array(z.string()).default([]),
  employeeCountMin: z.number().int().nonnegative().optional(),
  employeeCountMax: z.number().int().nonnegative().optional(),
  employeeCountEstimate: z.number().int().nonnegative().optional(),
  annualRevenueMin: z.number().nonnegative().optional(),
  annualRevenueMax: z.number().nonnegative().optional(),
  annualRevenueCurrency: z.string().default("USD"),
  companyType: z.string().optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  technologySignals: z.array(z.string()).default([]),
  growthSignals: z.array(z.string()).default([]),
  sourceExternalId: z.string().optional(),
  sourceUrl: z.string().optional(),
  providerRank: z.number().int().nonnegative().optional(),
  warnings: z.array(z.string()).default([]),
  dataQuality: z.enum(["high", "medium", "low", "unknown"]).optional(),
  fetchedAt: z.string().datetime().optional(),
});
export type DiscoveryCompanyCandidate = z.infer<typeof discoveryCompanyCandidateSchema>;

export const companyDiscoveryInputV1Schema = z.object({
  correlationId: z.string().min(1),
  projectSummary: z.string().optional(),
  targetCountryCode: z.string().length(2),
  industries: z.array(z.string()).default([]),
  companySizeMinEmployees: z.number().int().nonnegative().optional(),
  companySizeMaxEmployees: z.number().int().nonnegative().optional(),
  revenueMinUsd: z.number().nonnegative().optional(),
  revenueMaxUsd: z.number().nonnegative().optional(),
  companyTypes: z.array(z.string()).default([]),
  qualificationSignals: z.array(z.string()).default([]),
  disqualificationSignals: z.array(z.string()).default([]),
  purchaseTriggers: z.array(z.string()).default([]),
  technologySignals: z.array(z.string()).default([]),
  keywords: z.array(z.string()).optional(),
  exclusionDomains: z.array(z.string()).default([]),
  maxResults: z.number().int().positive().max(200).default(50),
  offset: z.number().int().nonnegative().max(10000).optional(),
  previousRunId: z.string().optional(),
});
export type CompanyDiscoveryInputV1 = z.infer<typeof companyDiscoveryInputV1Schema>;

export const companyDiscoveryOutputV1Schema = z.object({
  candidates: z.array(discoveryCompanyCandidateSchema),
  totalCount: z.number().int().nonnegative(),
  warnings: z.array(z.string()).default([]),
});
export type CompanyDiscoveryOutputV1 = z.infer<typeof companyDiscoveryOutputV1Schema>;

export interface CompanyDiscoveryProvider {
  readonly id: CompanyDiscoveryProviderId;
  readonly version: string;

  discoverCompaniesV1(
    input: CompanyDiscoveryInputV1,
  ): Promise<ProviderResult<CompanyDiscoveryOutputV1>>;
}
