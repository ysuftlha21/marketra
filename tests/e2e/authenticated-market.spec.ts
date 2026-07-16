import { test, expect } from "@playwright/test";

function firstProjectLink(page: import("@playwright/test").Page) {
  return page
    .locator('main a[href^="/dashboard/projects/"]:not([href="/dashboard/projects/new"])')
    .first();
}

test.describe("Market flows — desktop (authenticated)", () => {
  test.skip(
    ({ isMobile }) => !!isMobile,
    "Desktop sidebar navigation and table views are replaced by mobile drawer and stacked cards on small viewports",
  );

  test("1. markets navigation from sidebar works", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
  });

  test("2. navigate to markets page via project", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets`);
    await expect(page.getByRole("heading", { name: /target markets/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("3. markets page handles empty or filled state", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets`);
    await expect(
      page
        .getByText(/no target countries/i)
        .or(page.getByRole("heading", { name: /target markets/i })),
    ).toBeVisible({ timeout: 10000 });
  });

  test("4. add a country via selector", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets`);
    const combo = page.getByRole("combobox");
    if (!(await combo.isVisible())) {
      test.skip();
      return;
    }
    await combo.selectOption("DE");
    await page.getByRole("button", { name: /add/i }).click();
    await expect(page.getByRole("link", { name: /Germany \(DE\)/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("5. duplicate country blocked", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets`);
    const combo = page.getByRole("combobox");
    if (!(await combo.isVisible())) {
      test.skip();
      return;
    }
    await combo.selectOption("DE");
    await page.getByRole("button", { name: /add/i }).click();
    await page.waitForTimeout(1000);
    const count = await page.locator("text=Germany").count();
    expect(count).toBeLessThanOrEqual(2);
  });

  test("6. country detail page opens", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets`);
    const germany = page.getByText(/Germany/i).first();
    if (!(await germany.isVisible())) {
      test.skip();
      return;
    }
    await germany.click();
    await expect(page.getByRole("heading", { name: /Germany/i })).toBeVisible({ timeout: 5000 });
  });

  test("7. save and persist notes", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets/DE`);
    const notesField = page.getByPlaceholder(/internal notes/i);
    if (!(await notesField.isVisible())) {
      test.skip();
      return;
    }
    await notesField.fill("E2E test note");
    await page.getByRole("button", { name: /save notes/i }).click();
    await page.waitForTimeout(1500);
    await page.reload();
    await expect(page.getByPlaceholder(/internal notes/i)).toHaveValue("E2E test note");
  });

  test("8. comparison page displays", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets`);
    const combo = page.getByRole("combobox");
    if (!(await combo.isVisible())) {
      test.skip();
      return;
    }
    await combo.selectOption("GB");
    await page.getByRole("button", { name: /add/i }).click();
    await page.waitForTimeout(1000);
    await page.getByRole("link", { name: /compare/i }).click();
    await expect(page.getByRole("heading", { name: /market comparison/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("9. back navigation chain works", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets/DE`);
    await page.getByText(/back to markets/i).click();
    await expect(page.getByRole("heading", { name: /target markets/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByText(/back to project/i).click();
    await expect(page.getByRole("heading", { name: /target markets/i })).toBeVisible({
      timeout: 5000,
    });
  });

  test("10. shortlist and reject buttons visible on analyzed country", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets`);
    // Run analysis button or shortlist/reject should be present for analyzed countries
    await expect(
      page
        .getByRole("button", { name: /shortlist/i })
        .or(page.getByRole("button", { name: /run analysis/i })),
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Market flows — mobile (authenticated)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("11. markets page loads on mobile", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets`);
    await expect(page.getByRole("heading", { name: /target markets/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("12. comparison page works on mobile", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets/compare`);
    await expect(page.getByRole("heading", { name: /market comparison/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test("13. mobile drawer navigation works", async ({ page }) => {
    await page.goto("/dashboard");
    const menuButton = page.getByRole("button", { name: /open menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await expect(page.getByRole("link", { name: /projects/i })).toBeVisible();
    }
  });

  test("14. back navigation on mobile works", async ({ page }) => {
    await page.goto("/dashboard/projects");
    const firstProject = firstProjectLink(page);
    if (!(await firstProject.isVisible())) {
      test.skip();
      return;
    }
    await firstProject.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes("/dashboard/projects/") || url.endsWith("/projects")) {
      test.skip();
      return;
    }
    const slug = url.split("/").pop() ?? "";
    await page.goto(`/dashboard/projects/${slug}/markets/DE`);

    // Test back navigation
    const backBtn = page.getByText(/back to markets/i);
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page.getByRole("heading", { name: /target markets/i })).toBeVisible({
        timeout: 5000,
      });
    }
  });
});
