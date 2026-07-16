import { test, expect } from "@playwright/test";

test.describe("Outreach screenshots", () => {
  test.setTimeout(120000);

  async function navigateToOutreach(page: import("@playwright/test").Page) {
    // 1. Go to projects and find the seeded E2E Outreach project
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");
    const projectLink = page.getByRole("link", { name: /E2E-OUTREACH/i }).first();
    await expect(projectLink).toBeVisible({ timeout: 10000 });
    await projectLink.click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/dashboard\/projects\/[a-z0-9-]+$/);

    // Get project slug from URL
    const url = page.url();
    const projectSlug = url.split("/").pop();

    // Go directly to markets page
    await page.goto(`/dashboard/projects/${projectSlug}/markets`);
    await page.waitForLoadState("networkidle");

    // Global setup always seeds US market
    const countryCode = "US";

    // Go directly to discovery page
    await page.goto(`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery`);
    await page.waitForLoadState("networkidle");

    // Click on the first company
    const companyLinks = page.locator("a[href*='/discovery/']");
    const countCl = await companyLinks.count();
    let ch = "";
    for (let i = 0; i < countCl; i++) {
      const href = await companyLinks.nth(i).getAttribute("href");
      if (href && !href.includes("/runs/")) {
        ch = href;
        break;
      }
    }
    if (!ch) return false;

    // Outreach is embedded in the company detail page (no separate /outreach route).
    if (!ch.startsWith("/")) ch = `/${ch}`;

    await page.goto(ch);
    await page.waitForLoadState("networkidle");

    return true;
  }

  test("screenshot outreach desktop light", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "Desktop test only");

    await page.emulateMedia({ colorScheme: "light" });

    const found = await navigateToOutreach(page);
    if (!found) {
      test.skip();
      return;
    }

    await expect(page.getByText("Outreach Intelligence")).toBeVisible({ timeout: 10000 });

    // Generate draft
    await page.locator("#og-objective").fill("Follow up on previous email via desktop layout");
    await page.getByRole("button", { name: /generate outreach draft/i }).click();

    // Wait for completion
    await expect(page.getByText("Generating outreach…", { exact: false }).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/outreach draft generated/i)).toBeVisible({
      timeout: 15000,
    });

    const markdownPreview = page.locator(".whitespace-pre-wrap");
    await expect(markdownPreview).toBeVisible();

    await page.waitForTimeout(500);
    await page.screenshot({
      path: "tests/screenshots/outreach-desktop-light.png",
      fullPage: true,
    });
  });

  test("screenshot outreach mobile light", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "Mobile test only");

    await page.emulateMedia({ colorScheme: "light" });

    const found = await navigateToOutreach(page);
    if (!found) {
      test.skip();
      return;
    }

    await expect(page.getByText("Outreach Intelligence")).toBeVisible({ timeout: 10000 });

    // Generate draft
    await page.locator("#og-objective").fill("Follow up on previous email via mobile layout");
    await page.getByRole("button", { name: /generate outreach draft/i }).click();

    // Wait for completion
    await expect(page.getByText("Generating outreach…", { exact: false }).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/outreach draft generated/i)).toBeVisible({
      timeout: 15000,
    });

    const markdownPreview = page.locator(".whitespace-pre-wrap");
    await expect(markdownPreview).toBeVisible();

    await page.waitForTimeout(500);
    await page.screenshot({
      path: "tests/screenshots/outreach-mobile-light.png",
      fullPage: true,
    });
  });
});
