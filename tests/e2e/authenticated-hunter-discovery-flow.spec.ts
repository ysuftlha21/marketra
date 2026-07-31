import { expect, test } from "@playwright/test";

test.describe("provider-neutral discovery UI", () => {
  test("desktop shows validated filters and honest mock provenance", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop");
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Switch workspace" }).click();
    await page.getByRole("menuitemradio", { name: /E2E Outreach Desktop/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/dashboard/projects/e2e-outreach-desktop-empty/markets/US/discovery");
    await expect(page.getByRole("heading", { name: "Discovery filters" })).toBeVisible();
    await expect(page.getByText("Demo / Mock").first()).toBeVisible();
    const filters = page.getByRole("form", { name: "Company discovery filters" });
    await expect(filters.getByLabel("Industry")).toBeVisible();
    await expect(filters.getByLabel("Minimum employees")).toBeVisible();
    await expect(filters.getByLabel("Maximum employees")).toBeVisible();
    await expect(filters.getByLabel("Keywords, comma separated")).toBeVisible();
    await expect(filters.getByLabel("Technologies, comma separated")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  test("mobile discovery controls remain reachable without automatic enrichment", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile");
    await page.goto("/dashboard/companies");
    await expect(page.getByText(/discover matching companies/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /confirm and reveal/i })).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});
