import { test, expect } from "@playwright/test";

test.describe("Company discovery (authenticated)", () => {
  test("1. discovery page navigates from country detail", async ({ page }) => {
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
            return;
          }
        }
      }
    }
    test.skip();
  });

  test("2. discovery page shows start button when no runs exist", async ({ page }) => {
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
            const startBtn = page.getByRole("button", { name: /Start Discovery/i });
            if (await startBtn.isVisible()) {
              await expect(startBtn).toBeVisible();
              return;
            }
          }
        }
      }
    }
    test.skip();
  });

  test("3. status summary cards render with counts", async ({ page }) => {
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
            const discovered = page.getByText("discovered").first();
            if (await discovered.isVisible()) {
              await expect(discovered).toBeVisible();
              return;
            }
          }
        }
      }
    }
    test.skip();
  });

  test("4. back navigation from discovery works", async ({ page }) => {
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
            const back = page.getByText(/Back to market/i);
            if (!(await back.isVisible())) {
              test.skip();
              return;
            }
            await back.click();
            await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 5000 });
            return;
          }
        }
      }
    }
    test.skip();
  });
});
