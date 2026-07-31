import { z } from "zod";

export const dataProvenanceSchema = z.enum(["manual", "demo", "external"]);
export type DataProvenance = z.infer<typeof dataProvenanceSchema>;

export function companyProvenance(sourceProvider: string | null): DataProvenance {
  if (sourceProvider === "manual") return "manual";
  if (!sourceProvider || sourceProvider === "mock") return "demo";
  return "external";
}

export const PROVENANCE_LABEL: Record<DataProvenance, string> = {
  manual: "Manually entered",
  demo: "Demo data",
  external: "External source",
};

export function providerProvenanceLabel(
  sourceProvider: string | null,
): "Demo / Mock" | "Hunter" | "Manual" | "External" {
  if (sourceProvider === "hunter") return "Hunter";
  if (sourceProvider === "manual") return "Manual";
  if (!sourceProvider || sourceProvider === "mock") return "Demo / Mock";
  return "External";
}
