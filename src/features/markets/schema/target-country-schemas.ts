import { z } from "zod";
import { countryCodeSchema } from "@/config/countries";
import { targetCountryStatusSchema } from "../domain/target-country-status";

export const addTargetCountrySchema = z.object({
  projectSlug: z.string().min(1),
  countryCode: countryCodeSchema.refine((c) => c.length === 2, "Invalid country code"),
});

export const updateTargetCountrySchema = z.object({
  notes: z.string().max(2000, "Notes max 2000 characters").optional(),
  priority: z.number().int().min(1).max(5).optional(),
  analysisAssumptions: z.record(z.string(), z.unknown()).optional(),
});

export const changeCountryStatusSchema = z.object({
  status: targetCountryStatusSchema,
});
