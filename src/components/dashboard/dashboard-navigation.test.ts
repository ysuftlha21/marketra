import { describe, expect, it } from "vitest";
import { resolveDashboardModule } from "./dashboard-navigation";

describe("dashboard navigation route matching", () => {
  it.each([
    ["/dashboard", "dashboard"],
    ["/dashboard/projects", "projects"],
    ["/dashboard/projects/atlas", "projects"],
    ["/dashboard/projects/atlas/edit", "projects"],
    ["/dashboard/projects/atlas/markets", "markets"],
    ["/dashboard/projects/atlas/markets/DE", "markets"],
    ["/dashboard/projects/atlas/markets/DE/icp", "icp"],
    ["/dashboard/projects/atlas/markets/DE/icp/history", "icp"],
    ["/dashboard/projects/atlas/markets/DE/discovery", "companies"],
    ["/dashboard/projects/atlas/markets/DE/discovery/runs/run-1", "companies"],
    ["/dashboard/projects/atlas/markets/DE/discovery/company-1", "buyers"],
    ["/dashboard/projects/atlas/communication", "outreach"],
    ["/dashboard/projects/atlas/campaigns", "campaigns"],
    ["/dashboard/projects/atlas/crm", "crm"],
    ["/dashboard/projects/atlas/analytics", "analytics"],
    ["/dashboard/settings/billing", "billing"],
    ["/dashboard/settings", "settings"],
    ["/dashboard/getting-started", "onboarding"],
  ])("resolves %s to %s", (pathname, module) => {
    expect(resolveDashboardModule(pathname)).toBe(module);
  });

  it("does not let a broad project route override a nested workflow", () => {
    expect(resolveDashboardModule("/dashboard/projects/atlas/markets/US")).not.toBe("projects");
  });
});
