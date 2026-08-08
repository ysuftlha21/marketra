import { describe, expect, it } from "vitest";
import { deriveProjectPortfolioView, type ProjectPortfolioItem } from "./project-portfolio-view";

function project(
  overrides: Partial<ProjectPortfolioItem["activity"]> = {},
  status: ProjectPortfolioItem["status"] = "active",
): ProjectPortfolioItem {
  return {
    slug: "atlas",
    status,
    activity: {
      targetMarkets: [],
      productAnalysisReady: false,
      analyzedMarketCount: 0,
      approvedIcpCount: 0,
      companyCount: 0,
      buyerCount: 0,
      outreachDraftCount: 0,
      approvedDraftCount: 0,
      ...overrides,
    },
  };
}

describe("project portfolio view", () => {
  it("guides a new project to its first target market", () => {
    const view = deriveProjectPortfolioView(project());

    expect(view.health).toBe("incomplete");
    expect(view.nextAction.label).toBe("Add your first market");
    expect(view.progressPercent).toBe(11);
  });

  it("guides analyzed projects through the real market workflow", () => {
    const view = deriveProjectPortfolioView(
      project({
        productAnalysisReady: true,
        targetMarkets: [{ code: "DE", name: "Germany" }],
        analyzedMarketCount: 1,
      }),
    );

    expect(view.health).toBe("incomplete");
    expect(view.nextAction).toMatchObject({
      label: "Review market ICP",
      href: "/dashboard/projects/atlas/markets/DE/icp",
    });
  });

  it("marks projects ready only when an approved campaign draft exists", () => {
    const view = deriveProjectPortfolioView(
      project({
        productAnalysisReady: true,
        targetMarkets: [{ code: "DE", name: "Germany" }],
        analyzedMarketCount: 1,
        approvedIcpCount: 1,
        companyCount: 2,
        buyerCount: 2,
        outreachDraftCount: 1,
        approvedDraftCount: 1,
      }),
    );

    expect(view.health).toBe("ready");
    expect(view.nextAction.label).toBe("Open project CRM");
    expect(view.progressPercent).toBe(100);
  });

  it("keeps archived projects deterministic and non-actionable", () => {
    const view = deriveProjectPortfolioView(project({}, "archived"));

    expect(view.health).toBe("archived");
    expect(view.nextAction.label).toBe("Review archived project");
  });
});
