import { expect, test } from "@playwright/test";

test.describe("provider-neutral discovery UI", () => {
  async function openSeededCompany(page: import("@playwright/test").Page) {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Switch workspace" }).click();
    await page.getByRole("menuitemradio", { name: /E2E Outreach Desktop/i }).click();
    await page.waitForURL(/\/dashboard$/);
    await page.goto("/dashboard/projects/e2e-outreach-desktop-empty/markets/US/discovery");
    const company = page
      .locator(
        'a[href^="/dashboard/projects/e2e-outreach-desktop-empty/markets/US/discovery/"]:not([href*="/runs/"])',
      )
      .first();
    await expect(company).toBeVisible();
    await company.click();
    await page.waitForLoadState("networkidle");
  }
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

  test("buyer discovery requires explicit reveal and hands off idempotently", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop");
    test.skip(
      process.env.E2E_HUNTER_WORKFLOW_MIGRATION_READY !== "true",
      "Requires pending migration 0035 in the isolated E2E database.",
    );
    await openSeededCompany(page);
    await expect(page.getByRole("heading", { name: "Buyer discovery" })).toBeVisible();
    await page.getByRole("button", { name: "Find buyers" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved successfully.");
    await expect(page.getByText(/Email: not_found/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Reveal email" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Reveal this email?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Confirm and reveal" }).click();
    await expect(page.getByText(/Email: .*@/i).first()).toBeVisible();

    const handoff = page.getByRole("button", { name: "Add to outreach" }).first();
    await handoff.click();
    await expect(page.getByRole("status")).toHaveText("Saved successfully.");
    await handoff.click();
    await expect(page.getByRole("status")).toHaveText("Saved successfully.");
  });
});
