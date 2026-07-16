import { z } from "zod";

export const editDecisionRoleSchema = z.object({
  roleId: z.string().uuid(),
  companyId: z.string().uuid(),
  projectId: z.string().uuid(),
  projectSlug: z.string().min(1),
  role_title: z.string().min(1).max(100),
  role_family: z.string().min(1).max(100),
  department: z.string().min(1).max(100),
  buying_role: z.string().min(1).max(50),
  reasoning: z.string().min(1).max(1000),
  likely_pain_points: z.array(z.string().min(1).max(200)).max(10).default([]),
  likely_objections: z.array(z.string().min(1).max(200)).max(10).default([]),
  recommended_message_angles: z.array(z.string().min(1).max(200)).max(10).default([]),
  user_notes: z.string().max(2000).optional().nullable(),
});

export const addManualDecisionRoleSchema = editDecisionRoleSchema.omit({ roleId: true }).extend({
  sourceRunId: z.string().uuid(),
});
