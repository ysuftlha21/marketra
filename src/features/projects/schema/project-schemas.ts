import { z } from "zod";

const countryCodesSchema = z
  .array(
    z
      .string()
      .length(2, "Country code must be exactly 2 characters")
      .regex(/^[A-Z]{2}$/, "Must be a valid ISO 3166 alpha-2 country code")
      .transform((s) => s.toUpperCase()),
  )
  .max(50, "Maximum 50 markets allowed")
  .transform((values) => Array.from(new Set(values)));

export const additionalContextSchema = z.object({
  priorityRegions: z.string().optional(),
  countryDataCoverage: z.string().optional(),
  crmIntegrations: z.string().optional(),
  customerEvidence: z.string().optional(),
  knownCompetitors: z.string().optional(),
  technologyStack: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export type AdditionalContext = z.infer<typeof additionalContextSchema>;

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(2, "Project name must be at least 2 characters")
    .max(100, "Project name must be at most 100 characters"),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase and use hyphens")
    .optional(),
  websiteUrl: z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return undefined;
      return v;
    },
    z
      .string()
      .trim()
      .url("Must be a valid URL")
      .refine(
        (url) => {
          try {
            const parsed = new URL(url);
            return parsed.protocol === "https:" || parsed.protocol === "http:";
          } catch {
            return false;
          }
        },
        { message: "URL must use http or https protocol" },
      )
      .refine(
        (url) => {
          try {
            const parsed = new URL(url);
            const hostname = parsed.hostname.toLowerCase();
            if (
              hostname === "localhost" ||
              hostname === "127.0.0.1" ||
              hostname === "::1" ||
              hostname.startsWith("10.") ||
              hostname.startsWith("172.16.") ||
              hostname.startsWith("192.168.") ||
              hostname.endsWith(".local") ||
              hostname.endsWith(".internal")
            ) {
              return false;
            }
            return true;
          } catch {
            return false;
          }
        },
        { message: "Public HTTPS URLs only" },
      )
      .optional(),
  ),
  productDescription: z
    .string()
    .min(20, "Product description must be at least 20 characters")
    .max(5000, "Product description must be at most 5000 characters"),
  targetCustomerSummary: z
    .string()
    .max(2000, "Target customer summary must be at most 2000 characters")
    .optional(),
  businessModel: z.string().max(1000, "Business model must be at most 1000 characters").optional(),
  pricingSummary: z
    .string()
    .max(1000, "Pricing summary must be at most 1000 characters")
    .optional(),
  currentMarkets: countryCodesSchema.optional().default([]),
  targetExpansionMarkets: countryCodesSchema.optional(),
  additionalContext: additionalContextSchema.optional(),
  preferredLanguage: z.string().length(2).default("en"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(["draft", "active", "archived"]).optional(),
  additional_context: additionalContextSchema.optional().nullable(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectQuerySchema = z.object({
  includeArchived: z.boolean().optional().default(false),
});

export type ProjectQuery = z.infer<typeof projectQuerySchema>;
