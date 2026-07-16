import { z } from "zod";
import type { ProviderResult } from "../provider-types";

export const outreachChannelSchema = z.enum([
  "email",
  "linkedin_connection",
  "linkedin_message",
  "follow_up",
]);
export type OutreachChannel = z.infer<typeof outreachChannelSchema>;

export const outreachMessageTypeSchema = z.enum([
  "initial_contact",
  "meeting_request",
  "connection_request",
  "follow_up",
  "re_engagement",
]);
export type OutreachMessageType = z.infer<typeof outreachMessageTypeSchema>;

export const outreachLanguageSchema = z.enum(["en", "tr"]);
export type OutreachLanguage = z.infer<typeof outreachLanguageSchema>;

export const outreachToneSchema = z.enum([
  "professional",
  "concise",
  "consultative",
  "friendly",
  "direct",
]);
export type OutreachTone = z.infer<typeof outreachToneSchema>;

export const outreachLengthSchema = z.enum(["short", "medium", "long"]);
export type OutreachLength = z.infer<typeof outreachLengthSchema>;

export const OutreachGenerationInputSchema = z.object({
  correlationId: z.string().min(1),
  schemaVersion: z.string().default("1.0.0"),

  workspaceContext: z.object({
    workspaceId: z.string().uuid(),
    workspaceName: z.string(),
  }),

  productContext: z.object({
    productName: z.string(),
    productDescription: z.string(),
    capabilities: z.array(z.string()).default([]),
    targetCustomerSummary: z.string().optional(),
  }),

  marketContext: z
    .object({
      countryCode: z.string().length(2),
      countryName: z.string(),
      marketAttractiveness: z.string().optional(),
      opportunities: z.array(z.string()).default([]),
      risks: z.array(z.string()).default([]),
    })
    .optional(),

  icpContext: z.object({
    industries: z.array(z.string()).default([]),
    companySizes: z.array(z.string()).default([]),
    buyerRoles: z.array(z.string()).default([]),
    pains: z.array(z.string()).default([]),
    desiredOutcomes: z.array(z.string()).default([]),
  }),

  companyContext: z.object({
    companyName: z.string(),
    industry: z.string().optional(),
    employeeCountMin: z.number().nullable(),
    employeeCountMax: z.number().nullable(),
    companySize: z.string().optional(),
    fitScore: z.number().min(0).max(100),
    qualificationReasons: z.array(z.string()).default([]),
    disqualificationReasons: z.array(z.string()).default([]),
    purchaseSignals: z.array(z.string()).default([]),
  }),

  decisionRoleContext: z.object({
    roleKey: z.string(),
    roleTitle: z.string(),
    roleFamily: z.string(),
    department: z.string(),
    buyingRole: z.string(),
    priority: z.enum(["primary", "secondary", "supporting", "low"]),
    fitScore: z.number().min(0).max(100),
    likelyPainPoints: z.array(z.string()).default([]),
    likelyObjections: z.array(z.string()).default([]),
    recommendedMessageAngles: z.array(z.string()).default([]),
    reasoning: z.string(),
  }),

  outreachRequest: z.object({
    channel: outreachChannelSchema,
    messageType: outreachMessageTypeSchema,
    language: outreachLanguageSchema,
    tone: outreachToneSchema,
    length: outreachLengthSchema,
    objective: z.string().min(1).max(500),
    optionalUserInstructions: z.string().max(1000).optional(),
  }),
});
export type OutreachGenerationInput = z.infer<typeof OutreachGenerationInputSchema>;

export const OutreachDraftSchema = z.object({
  channel: outreachChannelSchema,
  messageType: outreachMessageTypeSchema,
  language: outreachLanguageSchema,
  subject: z.string().nullable(),
  body: z.string().min(1),
  callToAction: z.string().nullable(),
  tone: outreachToneSchema,
  length: outreachLengthSchema,
});
export type OutreachDraft = z.infer<typeof OutreachDraftSchema>;

export const OutreachDraftResultSchema = z.object({
  schemaVersion: z.string(),
  draft: OutreachDraftSchema,
  personalizationSummary: z.object({
    companyContextUsed: z.string(),
    roleContextUsed: z.string(),
    painPointUsed: z.string(),
    outreachAngleUsed: z.string(),
    countryOrMarketContextUsed: z.string().optional(),
  }),
  evidenceUsed: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(100),
});
export type OutreachDraftResult = z.infer<typeof OutreachDraftResultSchema>;

export interface OutreachProvider {
  readonly id: string;
  readonly version: string;
  generateOutreachDraft(
    input: OutreachGenerationInput,
  ): Promise<ProviderResult<OutreachDraftResult>>;
}
