import { z } from "zod";

export const buyerSearchSchema = z.object({
  projectId: z.string().uuid(),
  companyId: z.string().uuid(),
  department: z.string().max(40).optional(),
  seniority: z.string().max(40).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(25).default(10),
});

export const revealEmailSchema = z.object({
  projectId: z.string().uuid(),
  companyId: z.string().uuid(),
  contactId: z.string().uuid(),
  confirmed: z.literal("true"),
});

export const outreachLeadSchema = z.object({
  projectId: z.string().uuid(),
  companyId: z.string().uuid(),
  contactId: z.string().uuid(),
});
