import { z } from "zod";
import type { ProviderResult } from "../provider-types";
import type { ProductIntelligence } from "@/features/projects/domain/product-intelligence";

export const DecisionRoleGenerationInputSchema = z.object({
  correlationId: z.string(),
  productContext: z.custom<ProductIntelligence>(),
  targetCountryCode: z.string(),
  icpBuyerRoles: z.array(z.string()).default([]),
  icpPains: z.array(z.string()).default([]),
  icpOutcomes: z.array(z.string()).default([]),
  companyName: z.string(),
  companyIndustry: z.string(),
  companyEmployeeMin: z.number().nullable(),
  companyEmployeeMax: z.number().nullable(),
  companySignals: z.array(z.string()).default([]),
  companyDisqualifiers: z.array(z.string()).default([]),
  companyFitScore: z.number(),
  requestedLanguage: z.string().default("en"),
});

export type DecisionRoleGenerationInput = z.infer<typeof DecisionRoleGenerationInputSchema>;

export const DecisionRoleSchema = z.object({
  roleKey: z.string(),
  roleTitle: z.string(),
  roleFamily: z.string(),
  department: z.string(),
  buyingRole: z.string(),
  priority: z.enum(["primary", "secondary", "supporting", "low"]),
  fitScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  reasoning: z.string(),
  evidence: z.object({
    problemOwnership: z.string(),
    budgetInfluence: z.string(),
    decisionAuthority: z.string(),
    operationalImpact: z.string(),
    userRelevance: z.string(),
    icpAlignment: z.string(),
    industryAlignment: z.string(),
    companySizeAlignment: z.string(),
    countryRelevance: z.string(),
    evidenceQuality: z.string(),
  }),
  likelyPainPoints: z.array(z.string()),
  likelyObjections: z.array(z.string()),
  recommendedMessageAngles: z.array(z.string()),
  titleVariants: z.array(z.string()),
  seniorityLevels: z.array(z.string()),
  companySizeRelevance: z.string(),
  countryRelevance: z.string(),
});

export type DecisionRole = z.infer<typeof DecisionRoleSchema>;

export const ContactSequenceItemSchema = z.object({
  roleKey: z.string(),
  reason: z.string(),
  desiredOutcome: z.string(),
  informationToGather: z.string(),
});

export type ContactSequenceItem = z.infer<typeof ContactSequenceItemSchema>;

export const DecisionRolesResultSchema = z.object({
  schemaVersion: z.string(),
  companySummary: z.string(),
  buyingCommitteeSummary: z.string(),
  recommendedRoles: z.array(DecisionRoleSchema),
  contactSequence: z.array(ContactSequenceItemSchema),
  missingInformation: z.array(z.string()),
  warnings: z.array(z.string()),
  overallConfidence: z.number().min(0).max(100),
});

export type DecisionRolesResult = z.infer<typeof DecisionRolesResultSchema>;

export interface DecisionRoleProvider {
  id: string;
  version: string;
  generateRoles(input: DecisionRoleGenerationInput): Promise<ProviderResult<DecisionRolesResult>>;
}
