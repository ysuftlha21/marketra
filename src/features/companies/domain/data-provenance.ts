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
