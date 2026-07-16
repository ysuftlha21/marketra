import { describe, expect, it } from "vitest";
import {
  buildDashboardViewModel,
  type DashboardSnapshot,
} from "@/features/dashboard/domain/dashboard-view-model";

const workspace = { id: "ws-1", name: "Acme" };
const project = { id: "p-1", name: "Product", slug: "product", status: "active" as const };
const base: DashboardSnapshot = {
  workspace,
  project,
  markets: [],
  matchedCompanies: 0,
  decisionMakers: 0,
  activeCampaigns: 0,
};

describe("dashboard view model", () => {
  it("distinguishes no workspace, no project, and incomplete onboarding", () => {
    expect(buildDashboardViewModel({ ...base, workspace: null, project: null }).status).toBe(
      "no_workspace",
    );
    expect(buildDashboardViewModel({ ...base, project: null }).status).toBe("no_project");
    expect(
      buildDashboardViewModel({ ...base, project: { ...project, status: "draft" } }).status,
    ).toBe("onboarding_incomplete");
  });
  it("distinguishes market and analysis progress states", () => {
    expect(buildDashboardViewModel(base).status).toBe("no_markets");
    expect(
      buildDashboardViewModel({
        ...base,
        markets: [{ id: "m", code: "DE", name: "Germany", analysisStatus: null }],
      }).status,
    ).toBe("analysis_not_started");
    expect(
      buildDashboardViewModel({
        ...base,
        markets: [{ id: "m", code: "DE", name: "Germany", analysisStatus: "running" }],
      }).status,
    ).toBe("analysis_in_progress");
  });
  it("never invents metrics before analysis", () => {
    const model = buildDashboardViewModel(base);
    expect(model.metrics).toEqual({
      targetMarkets: 0,
      matchedCompanies: null,
      decisionMakers: null,
      activeCampaigns: 0,
      opportunityEstimate: null,
    });
  });
  it("distinguishes partial and populated real data", () => {
    const markets = [
      { id: "m", code: "DE", name: "Germany", analysisStatus: "succeeded" as const },
    ];
    expect(buildDashboardViewModel({ ...base, markets, matchedCompanies: 4 }).status).toBe(
      "partial",
    );
    expect(
      buildDashboardViewModel({ ...base, markets, matchedCompanies: 4, decisionMakers: 2 }).status,
    ).toBe("populated");
  });
  it("generates state-aware working next-step routes", () => {
    const model = buildDashboardViewModel(base);
    expect(model.nextSteps[0]?.href).toBe("/dashboard/projects/product/markets");
    expect(model.nextSteps[0]?.title).toBe("Select target markets");
  });
});
