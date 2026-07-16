import { test, expect } from "@playwright/test";

test.describe("Decision Roles screenshots", () => {
  test.setTimeout(90000);

  const projectName = `DR-Screen-${Date.now()}`;
  const projectDescription = "This is a product description long enough to pass validation.";

  async function createPrerequisites(page: import("@playwright/test").Page) {
    // 1. Create Project
    await page.goto("/dashboard/projects/new");
    await expect(page.getByRole("heading", { name: /new project/i }).first()).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel("Project name").fill(projectName);
    await page.getByLabel("Product description").fill(projectDescription);
    await page.getByRole("button", { name: /create project/i }).click();
    await expect(page).not.toHaveURL(/\/dashboard\/projects\/new/, { timeout: 15000 });

    const url = page.url();
    const projectSlug = url.split("/").pop();

    // 2. Generate Product Analysis
    const startBtn = page.getByRole("button", { name: /start analysis/i });
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();
    await expect(
      page
        .locator("h3")
        .filter({ hasText: /Value Proposition/i })
        .first(),
    ).toBeVisible({ timeout: 20000 });

    // 3. Add Market
    await page.goto(`/dashboard/projects/${projectSlug}/markets`);
    await page.waitForLoadState("networkidle");
    const addMarketBtn = page.getByRole("button", { name: /add market/i });

    // Check if there's an empty state or if we need to add a market
    if (await addMarketBtn.isVisible()) {
      await addMarketBtn.click();
      await page.getByRole("combobox").click();
      await page.getByRole("option").first().click();
      await page.getByRole("button", { name: /confirm/i }).click();
      await page.waitForTimeout(2000);
    }

    const marketLinks = page.locator("main a[href*='/markets/']");
    const count = await marketLinks.count();
    let countryCode = "US";
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const href = await marketLinks.nth(i).getAttribute("href");
        if (href && !href.includes("/icp") && !href.includes("/discovery")) {
          const parts = href.split("/");
          countryCode = parts[parts.length - 1];
          break;
        }
      }
    }

    // 4. Generate ICP
    await page.goto(`/dashboard/projects/${projectSlug}/markets/${countryCode}/icp`);
    await page.waitForLoadState("networkidle");
    const genIcpBtn = page.getByRole("button", { name: /Generate ICP/i });
    await expect(genIcpBtn).toBeVisible({ timeout: 10000 });
    await genIcpBtn.click();
    await expect(
      page
        .locator("h3")
        .filter({ hasText: /Target/i })
        .first(),
    ).toBeVisible({ timeout: 20000 });
    // Approve ICP
    const approveIcpBtn = page.getByRole("button", { name: /Approve/i }).first();
    await expect(approveIcpBtn).toBeVisible({ timeout: 10000 });
    await approveIcpBtn.click();
    await expect(page.getByText(/Approved/i).first()).toBeVisible({ timeout: 5000 });

    // 5. Generate Company Discovery
    await page.goto(`/dashboard/projects/${projectSlug}/markets/${countryCode}/discovery`);
    await page.waitForLoadState("networkidle");
    const genDiscBtn = page.getByRole("button", { name: /Discover Companies|Start Discovery/i });
    await expect(genDiscBtn).toBeVisible({ timeout: 10000 });
    await genDiscBtn.click();
    await expect(page.locator("table").first()).toBeVisible({ timeout: 45000 }); // Wait for companies table to appear

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
    if (ch) {
      await page.goto(ch);
      await page.waitForLoadState("networkidle");
      return true;
    }
    return false;
  }

  test("screenshot decision roles empty dark", async ({ page }) => {
    // skip mobile viewports
    if (page.viewportSize()?.width < 768) {
      test.skip();
      return;
    }
    await page.emulateMedia({ colorScheme: "dark" });
    const found = await createPrerequisites(page);
    if (!found) {
      test.skip();
      return;
    }

    await page.waitForTimeout(500);
    await page.screenshot({
      path: "tests/screenshots/decision-makers-empty-dark.png",
      fullPage: true,
    });
  });

  test("screenshot decision roles complete dark", async ({ page }) => {
    if (page.viewportSize()?.width < 768) {
      test.skip();
      return;
    }
    await page.emulateMedia({ colorScheme: "dark" });
    const found = await createPrerequisites(page);
    if (!found) {
      test.skip();
      return;
    }

    const startBtn = page.getByRole("button", { name: /Discover Decision Makers|Generate Roles/i });
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: "tests/screenshots/decision-makers-progress-dark.png",
        fullPage: true,
      });
      await expect(page.locator("h3").filter({ hasText: /Role/i }).first()).toBeVisible({
        timeout: 15000,
      });
    } else {
      await expect(page.locator("h3").filter({ hasText: /Role/i }).first()).toBeVisible({
        timeout: 10000,
      });
    }

    await page.screenshot({
      path: "tests/screenshots/decision-makers-complete-dark.png",
      fullPage: true,
    });

    const historyBtn = page.getByRole("button", { name: /History/i });
    if (await historyBtn.isVisible()) {
      await historyBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await page.screenshot({
        path: "tests/screenshots/decision-maker-history-dark.png",
        fullPage: true,
      });
      await page.keyboard.press("Escape");
    }

    const editBtn = page.getByRole("button", { name: /Edit/i }).first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await page.screenshot({
        path: "tests/screenshots/decision-maker-role-edit-light.png",
        fullPage: true,
      });
      await page.keyboard.press("Escape");
    }
  });

  test("screenshot decision roles light and mobile", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    const found = await createPrerequisites(page);
    if (!found) {
      test.skip();
      return;
    }

    // Start generation if needed
    const startBtn = page.getByRole("button", { name: /Discover Decision Makers|Generate Roles/i });
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await expect(page.locator("h3").filter({ hasText: /Role/i }).first()).toBeVisible({
        timeout: 15000,
      });
    }

    await expect(page.locator("h3").filter({ hasText: /Role/i }).first()).toBeVisible({
      timeout: 10000,
    });
    await page.screenshot({
      path: "tests/screenshots/decision-makers-complete-light.png",
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "tests/screenshots/decision-makers-mobile-light.png",
      fullPage: true,
    });
  });
});
