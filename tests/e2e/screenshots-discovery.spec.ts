import { test, expect } from "@playwright/test";

test.describe("Discovery screenshots", () => {
  test("screenshot discovery page desktop", async ({ page }) => {
    test.setTimeout(30000);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Switch workspace" }).click();
    await page.getByRole("menuitemradio", { name: /E2E Outreach Desktop/i }).click();
    await page.waitForTimeout(1000);
    await page.goto("/dashboard/projects/e2e-outreach-desktop-empty/markets/US/discovery");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("form", { name: "Company discovery filters" })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/discovery-desktop.png", fullPage: true });
  });

  test("screenshot discovery page mobile", async ({ page }) => {
    test.setTimeout(30000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/projects/e2e-outreach-desktop-empty/markets/US/discovery");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("form", { name: "Company discovery filters" })).toBeVisible();
    await page.screenshot({ path: "tests/screenshots/discovery-mobile.png", fullPage: true });
  });

  test("screenshot discovery company detail", async ({ page }) => {
    test.setTimeout(30000);
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");
    const links = page.locator("main a");
    const c = await links.count();
    for (let i = 0; i < c; i++) {
      const h = await links.nth(i).getAttribute("href");
      if (
        h?.includes("/dashboard/projects/") &&
        h.split("/").length > 4 &&
        !h.includes("/markets")
      ) {
        const parts = h.split("/");
        const slug = parts[parts.length - 1];
        await page.goto(`/dashboard/projects/${slug}/markets`);
        await page.waitForLoadState("networkidle");
        const mlinks = page.locator("main a");
        const mc = await mlinks.count();
        for (let j = 0; j < mc; j++) {
          const mh = await mlinks.nth(j).getAttribute("href");
          if (
            mh?.includes("/markets/") &&
            mh.split("/").length > 5 &&
            !mh.includes("/icp") &&
            !mh.includes("/discovery")
          ) {
            await page.goto(`${mh}/discovery`);
            await page.waitForLoadState("networkidle");
            const companyLinks = page.locator("main a");
            const cc = await companyLinks.count();
            for (let k = 0; k < cc; k++) {
              const ch = await companyLinks.nth(k).getAttribute("href");
              if (ch?.includes("/discovery/") && !ch.includes("/runs/")) {
                await companyLinks.nth(k).click();
                await page.waitForLoadState("networkidle");
                await expect(
                  page.getByText(/Back to discovery/i).or(page.getByText(/Match Score/i)),
                ).toBeVisible({ timeout: 10000 });
                await page.waitForTimeout(500);
                await page.screenshot({
                  path: "tests/screenshots/discovery-company-detail.png",
                  fullPage: true,
                });
                return;
              }
            }

            return;
          }
        }
      }
    }
  });

  test("screenshot discovery run detail", async ({ page }) => {
    test.setTimeout(30000);
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");
    const links = page.locator("main a");
    const c = await links.count();
    for (let i = 0; i < c; i++) {
      const h = await links.nth(i).getAttribute("href");
      if (
        h?.includes("/dashboard/projects/") &&
        h.split("/").length > 4 &&
        !h.includes("/markets")
      ) {
        const parts = h.split("/");
        const slug = parts[parts.length - 1];
        await page.goto(`/dashboard/projects/${slug}/markets`);
        await page.waitForLoadState("networkidle");
        const mlinks = page.locator("main a");
        const mc = await mlinks.count();
        for (let j = 0; j < mc; j++) {
          const mh = await mlinks.nth(j).getAttribute("href");
          if (
            mh?.includes("/markets/") &&
            mh.split("/").length > 5 &&
            !mh.includes("/icp") &&
            !mh.includes("/discovery")
          ) {
            await page.goto(`${mh}/discovery`);
            await page.waitForLoadState("networkidle");
            const runLinks = page.locator("main a");
            const rc = await runLinks.count();
            for (let k = 0; k < rc; k++) {
              const rh = await runLinks.nth(k).getAttribute("href");
              if (rh?.includes("/runs/")) {
                await runLinks.nth(k).click();
                await page.waitForLoadState("networkidle");
                await expect(page.getByRole("heading", { name: /Discovery Run/i })).toBeVisible({
                  timeout: 10000,
                });
                await page.waitForTimeout(500);
                await page.screenshot({
                  path: "tests/screenshots/discovery-run-detail.png",
                  fullPage: true,
                });
                return;
              }
            }

            return;
          }
        }
      }
    }
  });

  test("screenshot discovery dark mode", async ({ page }) => {
    test.setTimeout(30000);
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");
    const links = page.locator("main a");
    const c = await links.count();
    for (let i = 0; i < c; i++) {
      const h = await links.nth(i).getAttribute("href");
      if (
        h?.includes("/dashboard/projects/") &&
        h.split("/").length > 4 &&
        !h.includes("/markets")
      ) {
        const parts = h.split("/");
        const slug = parts[parts.length - 1];
        await page.goto(`/dashboard/projects/${slug}/markets`);
        await page.waitForLoadState("networkidle");
        const mlinks = page.locator("main a");
        const mc = await mlinks.count();
        for (let j = 0; j < mc; j++) {
          const mh = await mlinks.nth(j).getAttribute("href");
          if (
            mh?.includes("/markets/") &&
            mh.split("/").length > 5 &&
            !mh.includes("/icp") &&
            !mh.includes("/discovery")
          ) {
            await page.goto(`${mh}/discovery`);
            await page.waitForLoadState("networkidle");
            await expect(
              page.getByText(/Company Discovery/i).or(page.getByText(/discovered yet/i)),
            ).toBeVisible({
              timeout: 10000,
            });
            await page.evaluate(() => {
              document.documentElement.classList.add("dark");
            });
            await page.waitForTimeout(500);
            await page.screenshot({
              path: "tests/screenshots/discovery-dark-mode.png",
              fullPage: true,
            });
            return;
          }
        }
      }
    }
  });
});
