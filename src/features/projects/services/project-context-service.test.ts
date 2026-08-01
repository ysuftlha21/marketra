import { describe, expect, it } from "vitest";
import type { ProjectRow, AnalysisRunRow } from "../repository/project-repository";
import type { TargetCountrySummary } from "@/features/markets/repository/market-repository";
import type { IcpProfileRow } from "@/features/icp/repository/icp-repository";
import { deriveProjectContextState } from "./project-context-service";

const project = {
  id: "project",
  name: "Marketra",
  product_description: "GTM platform",
} as ProjectRow;
const market = { id: "market", country_code: "US" } as TargetCountrySummary;
const analysis = { id: "analysis", status: "succeeded" } as AnalysisRunRow;
const approvedIcp = { id: "icp", status: "approved" } as IcpProfileRow;
const draftIcp = { id: "draft", status: "draft" } as IcpProfileRow;

describe("canonical project readiness policy", () => {
  it("distinguishes product context and analysis prerequisites", () => {
    expect(
      deriveProjectContextState({ ...project, product_description: "" }, [], null, null, null),
    ).toBe("product_context_missing");
    expect(deriveProjectContextState(project, [], null, null, null)).toBe(
      "product_analysis_missing",
    );
  });

  it("distinguishes market, missing ICP and incomplete ICP states", () => {
    expect(deriveProjectContextState(project, [], analysis, null, null)).toBe("markets_missing");
    expect(deriveProjectContextState(project, [market], analysis, null, null)).toBe("icp_missing");
    expect(deriveProjectContextState(project, [market], analysis, null, draftIcp)).toBe(
      "icp_incomplete",
    );
  });

  it("recognizes existing approved ICP data as ready", () => {
    expect(deriveProjectContextState(project, [market], analysis, approvedIcp, approvedIcp)).toBe(
      "ready",
    );
  });
});
