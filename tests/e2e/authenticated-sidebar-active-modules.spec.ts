import { expect, test } from "@playwright/test";

test.describe("Dashboard module-aware navigation", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium navigation contract");

  test("highlights the semantic module instead of the broad project parent", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Desktop route matrix");
    await page.goto("/dashboard");
    const cases = [
      ["/dashboard", "Dashboard"],
      ["/dashboard/projects", "Projects"],
      ["/dashboard/projects/atlas/markets", "Markets"],
      ["/dashboard/projects/atlas/markets/US/icp", "ICP Builder"],
      ["/dashboard/projects/atlas/markets/US/discovery", "Company Discovery"],
      ["/dashboard/projects/atlas/markets/US/discovery/company-1", "Buyer Discovery"],
      ["/dashboard/outreach", "AI Outreach"],
      ["/dashboard/campaigns", "Campaigns"],
      ["/dashboard/crm", "CRM"],
      ["/dashboard/analytics", "Analytics"],
      ["/dashboard/settings/billing", "Billing"],
      ["/dashboard/settings", "Settings"],
    ] as const;

    for (const [url, activeLabel] of cases) {
      await page.evaluate((pathname) => window.history.pushState(null, "", pathname), url);
      const navigation = page.getByRole("navigation", { name: "Dashboard" }).first();
      await expect(
        navigation.getByRole("link", { name: activeLabel, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(navigation.locator('a[aria-current="page"]')).toHaveCount(1);
    }
  });
});
