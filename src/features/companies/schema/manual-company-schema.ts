import { z } from "zod";
import { isSafeStoredUrl } from "@/lib/security/ssrf";

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().max(2048).refine(isSafeStoredUrl, "Enter a safe public URL.").optional(),
);

const signalList = z.preprocess(
  (value) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : value,
  z.array(z.string().min(1).max(100)).max(30).default([]),
);
const optionalEmployeeCount = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().nonnegative().max(10_000_000).optional(),
);

export const manualCompanySchema = z
  .object({
    projectSlug: z.string().min(1).max(100),
    targetCountryId: z.string().uuid(),
    companyName: z.string().trim().min(2).max(200),
    websiteUrl: optionalUrl,
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase()),
    city: z.string().trim().max(120).optional().default(""),
    industry: z.string().trim().min(2).max(120),
    employeeMin: optionalEmployeeCount,
    employeeMax: optionalEmployeeCount,
    description: z.string().trim().max(3000).optional().default(""),
    technologySignals: signalList,
    purchaseSignals: signalList,
    sourceUrl: optionalUrl,
    notes: z.string().trim().max(5000).optional().default(""),
  })
  .refine(
    (data) =>
      data.employeeMin === undefined ||
      data.employeeMax === undefined ||
      data.employeeMin <= data.employeeMax,
    { path: ["employeeMax"], message: "Maximum employees must be at least the minimum." },
  );

export type ManualCompanyInput = z.infer<typeof manualCompanySchema>;
