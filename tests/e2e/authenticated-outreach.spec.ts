import { test, expect } from "@playwright/test";

/**
 * Navigates to the company detail page (which embeds the Outreach section)
 * using only UI interactions — no service-role client.
 */
async function navigateToCompanyOutreach(
  page: import("@playwright/test").Page,
  projectPrefix: string,
) {
  // 1. Go to projects list and find the seeded project
  await page.goto("/dashboard/projects");
  await page.waitForLoadState("networkidle");

  const projectLink = page.getByRole("link", { name: new RegExp(projectPrefix, "i") }).first();
  await expect(projectLink).toBeVisible({ timeout: 10000 });
  await projectLink.click();
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/dashboard\/projects\/[a-z0-9-]+$/);

  // 2. Extract slug, go to discovery
  const projectSlug = page.url().split("/").pop()!;
  const countryCode = "US"; // global setup always seeds US

  await page.goto(`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery`);
  await page.waitForLoadState("networkidle");

  // 3. Find the first company link (not a runs link)
  const companyLinks = page.locator("a[href*='/discovery/']");
  const count = await companyLinks.count();
  let companyHref = "";
  for (let i = 0; i < count; i++) {
    const href = await companyLinks.nth(i).getAttribute("href");
    if (href && !href.includes("/runs/")) {
      companyHref = href;
      break;
    }
  }
  if (!companyHref) return false;

  if (!companyHref.startsWith("/")) companyHref = `/${companyHref}`;

  // 4. Navigate to company detail page (outreach section is embedded there)
  await page.goto(companyHref);
  await page.waitForLoadState("networkidle");

  return true;
}

test.describe("Phase 8.2 Outreach E2E Workflows", () => {
  test.setTimeout(120000);

  // ── A. Desktop Flow ──

  test.describe("desktop", () => {
    test("A. Real desktop generation", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium-desktop", "Desktop test only");

      const found = await navigateToCompanyOutreach(page, "E2E-OUTREACH-DESKTOP");
      if (!found) {
        test.skip();
        return;
      }

      // Outreach section should be visible (it's at the bottom of the page)
      await expect(page.getByText("Outreach Intelligence")).toBeVisible({
        timeout: 10000,
      });

      // Verify primary role is selected by default
      const roleSelect = page.locator("#og-role");
      await expect(roleSelect).toBeVisible({ timeout: 10000 });
      await expect(page.locator("#og-role option:checked")).toContainText(
        "Chief Technology Officer",
      );

      // Set valid inputs (objective)
      await page
        .locator("#og-objective")
        .fill("Introduce our SaaS platform and request a discovery call for the desktop workflow");

      // Trigger generation
      await page.getByRole("button", { name: /generate outreach draft/i }).click();

      // Track active progress UI states
      await expect(page.getByText("Generating outreach…", { exact: false }).first()).toBeVisible({
        timeout: 5000,
      });

      // Wait for completion
      await expect(page.getByText(/outreach draft generated/i)).toBeVisible({
        timeout: 15000,
      });

      // Verify successful render and copy behavior
      const markdownPreview = page.locator(".whitespace-pre-wrap");
      await expect(markdownPreview).toBeVisible();

      const copyButton = page.getByRole("button", {
        name: /copy full message/i,
      });
      await expect(copyButton).toBeVisible();

      // Give the clipboard API permission
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
      await copyButton.click();

      // Verify clipboard contents
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText.length).toBeGreaterThan(0);
    });
  });

  // ── B. Mobile Flow ──

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("B. Real mobile generation", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium-mobile", "Mobile test only");

      const found = await navigateToCompanyOutreach(page, "E2E-OUTREACH-MOBILE");
      if (!found) {
        test.skip();
        return;
      }

      await expect(page.getByText("Outreach Intelligence")).toBeVisible({
        timeout: 10000,
      });

      // Switch from primary to secondary role
      const roleSelect = page.locator("#og-role");
      await expect(roleSelect).toBeVisible();

      // Find secondary option (contains "Secondary")
      const secondaryOption = page.locator("#og-role option", {
        hasText: "Secondary",
      });
      const secondaryValue = await secondaryOption.getAttribute("value");
      if (secondaryValue) {
        await roleSelect.selectOption({ value: secondaryValue });
      }

      // Submit
      await page.locator("#og-objective").fill("Follow up on previous email via mobile layout");
      await page.getByRole("button", { name: /generate outreach draft/i }).click();

      // Wait for completion
      await expect(page.getByText("Generating outreach…", { exact: false }).first()).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/outreach draft generated/i)).toBeVisible({
        timeout: 15000,
      });

      // Verify layout/rendering inside mobile constraints
      const viewportWidth = page.viewportSize()?.width || 390;
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);

      const markdownPreview = page.locator(".whitespace-pre-wrap");
      await expect(markdownPreview).toBeVisible();
    });
  });
});
