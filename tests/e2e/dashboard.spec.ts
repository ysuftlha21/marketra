import { test, expect } from "@playwright/test";

test.describe("Dashboard shell", () => {
  test("all dashboard routes load without runtime errors", async ({ page }) => {
    const routes = [
      "/dashboard",
      "/dashboard/projects",
      "/dashboard/markets",
      "/dashboard/companies",
      "/dashboard/outreach",
      "/dashboard/crm",
      "/dashboard/settings",
    ];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
