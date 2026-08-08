import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DashboardViewModel } from "../domain/dashboard-view-model";
import { DashboardStateOverview } from "./dashboard-state-overview";

vi.mock("./market-map", () => ({
  MarketMap: () => <div aria-label="Market map" />,
}));

const model: DashboardViewModel = {
  status: "no_markets",
  workspace: { id: "workspace-1", name: "Acme" },
  project: { id: "project-1", name: "Launchpad", slug: "launchpad", status: "active" },
  onboardingComplete: true,
  targetMarkets: [],
  metrics: {
    targetMarkets: 0,
    matchedCompanies: null,
    decisionMakers: null,
    activeCampaigns: 0,
    opportunityEstimate: null,
  },
  nextSteps: [
    {
      title: "Select target markets",
      description: "Choose countries to evaluate.",
      href: "/dashboard/projects/launchpad/markets",
      action: "Select",
    },
  ],
  recommendation: null,
  opportunities: [],
  recentActivity: [],
  performance: null,
  isDemoMode: false,
};

describe("DashboardStateOverview", () => {
  it("renders workspace and project context with consistent metrics", () => {
    render(<DashboardStateOverview model={model} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to Marketra" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Acme workspace/)).toBeInTheDocument();
    expect(screen.getByText("Launchpad")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Workspace metrics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Target Markets" })).toBeInTheDocument();
  });

  it("provides actions for every empty overview section", () => {
    render(<DashboardStateOverview model={model} />);
    expect(screen.getByRole("link", { name: "Select Markets" })).toHaveAttribute(
      "href",
      "/dashboard/projects/launchpad/markets",
    );
    expect(screen.getByRole("link", { name: /Start Analysis/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Analyze Markets/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View Projects/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Analytics/ })).toBeInTheDocument();
  });
});
