import { z } from "zod";

export const icpEditSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  summary: z.string().min(1).max(1000).optional(),
  industrySegments: z.record(z.string(), z.unknown()).optional(),
  companyAttributes: z.record(z.string(), z.unknown()).optional(),
  buyerRoles: z.array(z.record(z.string(), z.unknown())).optional(),
  userRoles: z.array(z.record(z.string(), z.unknown())).optional(),
  pains: z.array(z.unknown()).optional(),
  desiredOutcomes: z.array(z.unknown()).optional(),
  purchaseTriggers: z.array(z.string()).optional(),
  qualificationSignals: z.array(z.string()).optional(),
  disqualificationSignals: z.array(z.string()).optional(),
  objections: z.array(z.record(z.string(), z.unknown())).optional(),
  assumptions: z.array(z.string()).optional(),
  missingInformation: z.array(z.string()).optional(),
  validationQuestions: z.array(z.string()).optional(),
  technologyContext: z.record(z.string(), z.unknown()).optional(),
  procurementContext: z.record(z.string(), z.unknown()).optional(),
  localizationRequirements: z.record(z.string(), z.unknown()).optional(),
});

export type IcpEditInput = z.infer<typeof icpEditSchema>;
