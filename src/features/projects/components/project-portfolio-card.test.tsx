import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deriveProjectPortfolioView } from "../domain/project-portfolio-view";
import { ProjectPortfolioCard } from "./project-portfolio-card";

const project = {
  id: "project-1",
  name: "Atlas",
  slug: "atlas",
  website_url: "https://atlas.example.com",
  status: "active" as const,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-08T00:00:00.000Z",
  activity: {
    targetMarkets: [{ code: "DE", name: "Germany" }],
    productAnalysisReady: true,
    analyzedMarketCount: 1,
    approvedIcpCount: 0,
    companyCount: 0,
    buyerCount: 0,
    outreachDraftCount: 0,
    approvedDraftCount: 0,
  },
};

describe("ProjectPortfolioCard", () => {
  it("renders portfolio health, metrics, progress, and a deterministic next action", () => {
    const view = deriveProjectPortfolioView(project);

    render(
      <ProjectPortfolioCard
        project={project}
        view={view}
        hostname="atlas.example.com"
        createdLabel="Aug 1, 2026"
        updatedLabel="Aug 8, 2026"
        isActive
        actions={<button type="button">Project actions</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Atlas" })).toBeVisible();
    expect(screen.getByText("Current")).toBeVisible();
    expect(screen.getByText("Incomplete")).toBeVisible();
    expect(screen.getByText("Created Aug 1, 2026")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
    expect(screen.getByRole("link", { name: "Next action: Review market ICP" })).toHaveAttribute(
      "href",
      "/dashboard/projects/atlas/markets/DE/icp",
    );
    expect(screen.getByLabelText("Target markets")).toHaveTextContent("DE");
  });

  it("exposes one full-card project link without duplicating the visible project title", () => {
    render(
      <ProjectPortfolioCard
        project={project}
        view={deriveProjectPortfolioView(project)}
        hostname="atlas.example.com"
        createdLabel="Aug 1, 2026"
        updatedLabel="Aug 8, 2026"
        isActive={false}
        actions={null}
      />,
    );

    expect(screen.getAllByRole("link", { name: "Open Atlas project" })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: "Atlas" })).toHaveLength(1);
  });
});
