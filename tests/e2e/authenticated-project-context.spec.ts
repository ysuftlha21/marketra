import { expect, test } from "@playwright/test";

test.describe("canonical dashboard project context", () => {
  test("desktop project selection propagates across feature gateways and refresh", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop");
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Switch workspace" }).click();
    await page.getByRole("menuitemradio", { name: /E2E Outreach Desktop/i }).click();
    await expect(page.getByRole("button", { name: "Switch workspace" })).toContainText(
      "E2E Outreach Desktop",
      { timeout: 15000 },
    );

    await page.getByRole("combobox", { name: "Active project" }).selectOption({
      value: "e2e-outreach-desktop-empty",
    });
    await page.waitForTimeout(1000);

    await page.goto("/dashboard/companies");
    await expect(page).toHaveURL(
      /\/dashboard\/projects\/e2e-outreach-desktop-empty\/markets\/US\/discovery/,
    );
    await expect(page.getByRole("form", { name: "Company discovery filters" })).toBeVisible();
    await expect(page.getByText("Create ICP", { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("form", { name: "Company discovery filters" })).toBeVisible();

    await page.goto("/dashboard/markets");
    await expect(page).toHaveURL(/\/dashboard\/projects\/e2e-outreach-desktop-empty\/markets$/);

    await page.goto("/dashboard/icp");
    await expect(page).toHaveURL(
      /\/dashboard\/projects\/e2e-outreach-desktop-empty\/markets\/US\/icp$/,
    );
    await expect(page.getByText("No ICP yet", { exact: true })).toHaveCount(0);

    await page.goto("/dashboard/buyers");
    await expect(page.getByText("Select a saved company", { exact: true })).toBeVisible();
    await page.goto("/dashboard/outreach");
    await expect(page.getByRole("combobox", { name: "Project" })).toHaveValue(/.+/);
    await page.goto("/dashboard/crm");
    await expect(page.getByText("Create an outreach draft first", { exact: true })).toBeVisible();
    await page.goto("/dashboard/analytics");
    await expect(page.getByText("No activity yet", { exact: true })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/companies");
    await expect(page).toHaveURL(
      /\/dashboard\/projects\/e2e-outreach-desktop-empty\/markets\/US\/discovery/,
    );
    await expect(page.getByRole("form", { name: "Company discovery filters" })).toBeVisible({
      timeout: 15_000,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});
