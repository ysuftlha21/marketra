import { z } from "zod";
import { discoveryRunStatusSchema } from "../domain/discovery-run-status";
import { projectCompanyStatusSchema } from "../domain/company-lifecycle";

export function readOptionalDiscoveryText(formData: FormData, field: string): string | undefined {
  return formData.has(field) ? String(formData.get(field) ?? "") : undefined;
}

export const startDiscoverySchema = z
  .object({
    projectSlug: z.string().min(1),
    targetCountryId: z.string().uuid(),
    maxResults: z.coerce.number().int().positive().max(200).optional().default(5),
    industry: z.string().trim().max(100).optional(),
    employeeMin: z.coerce.number().int().nonnegative().optional(),
    employeeMax: z.coerce.number().int().nonnegative().optional(),
    keywords: z.string().trim().max(300).optional(),
    keywordMatchMode: z.enum(["any", "all"]).default("any"),
    technologies: z.string().trim().max(300).optional(),
    page: z.coerce.number().int().positive().default(1),
  })
  .refine(
    (value) =>
      value.employeeMin === undefined ||
      value.employeeMax === undefined ||
      value.employeeMin <= value.employeeMax,
    {
      path: ["employeeMax"],
      message: "Maximum employees must be greater than minimum employees.",
    },
  );

export const startDiscoveryResponseSchema = z.object({
  runId: z.string().uuid(),
  status: discoveryRunStatusSchema,
});

export const retryDiscoverySchema = z.object({
  projectSlug: z.string().min(1),
  runId: z.string().uuid(),
});

export const lifecycleActionSchema = z.object({
  projectSlug: z.string().min(1),
  companyId: z.string().uuid(),
  status: projectCompanyStatusSchema,
});

export const updateNotesSchema = z.object({
  projectSlug: z.string().min(1),
  companyId: z.string().uuid(),
  reviewerNotes: z.string().max(5000).nullable(),
});

export const discoveryFiltersSchema = z.object({
  targetCountryId: z.string().uuid().optional(),
  status: projectCompanyStatusSchema.optional(),
  fitScoreMin: z.coerce.number().int().min(0).max(100).optional(),
  fitScoreMax: z.coerce.number().int().min(0).max(100).optional(),
  confidenceMin: z.coerce.number().int().min(0).max(100).optional(),
  industry: z.string().optional(),
  employeeMin: z.coerce.number().int().nonnegative().optional(),
  employeeMax: z.coerce.number().int().nonnegative().optional(),
  hasDomain: z.coerce.boolean().optional(),
  disqualifiedOnly: z.coerce.boolean().optional(),
  discoveryRunId: z.string().uuid().optional(),
  sort: z
    .enum(["fit_score_desc", "fit_score_asc", "confidence_desc", "newest", "name_asc"])
    .optional()
    .default("fit_score_desc"),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(25),
});

export type DiscoveryFilters = z.infer<typeof discoveryFiltersSchema>;

export type StartDiscoveryInput = z.infer<typeof startDiscoverySchema>;
export type StartDiscoveryResponse = z.infer<typeof startDiscoveryResponseSchema>;
export type RetryDiscoveryInput = z.infer<typeof retryDiscoverySchema>;
export type LifecycleActionInput = z.infer<typeof lifecycleActionSchema>;
export type UpdateNotesInput = z.infer<typeof updateNotesSchema>;
