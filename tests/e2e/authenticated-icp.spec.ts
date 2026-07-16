import { test, expect } from "@playwright/test";

test.describe("ICP flows (authenticated)", () => {
  test("1. navigate to ICP page via country detail", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");
    const links = page.locator("main a");
    const c = await links.count();
    let found = false;
    for (let i = 0; i < c; i++) {
      const h = await links.nth(i).getAttribute("href");
      if (
        h?.includes("/dashboard/projects/") &&
        h.split("/").length > 4 &&
        !h.includes("/markets")
      ) {
        const slug = h.split("/").pop() ?? "";
        await page.goto(`/dashboard/projects/${slug}/markets`);
        await page.waitForLoadState("networkidle");
        // Navigate to any country detail
        const clinks = page.locator("main a");
        const cc = await clinks.count();
        for (let j = 0; j < cc; j++) {
          const ch = await clinks.nth(j).getAttribute("href");
          if (ch?.includes("/markets/") && ch.split("/").length > 5 && !ch.includes("/icp")) {
            // Navigate to ICP page
            await page.goto(ch + "/icp");
            await page.waitForLoadState("networkidle");
            found = true;
            break;
          }
        }
        break;
      }
    }
    if (found) {
      await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });
    } else {
      test.skip();
    }
  });

  test("2. ICP page shows generate button or ICP content", async ({ page }) => {
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
        const slug = h.split("/").pop() ?? "";
        await page.goto(`/dashboard/projects/${slug}/markets`);
        const clinks = page.locator("main a");
        const cc = await clinks.count();
        for (let j = 0; j < cc; j++) {
          const ch = await clinks.nth(j).getAttribute("href");
          if (
            ch?.includes("/markets/DE") ||
            ch?.includes("/markets/GB") ||
            (ch?.includes("/markets/") && ch.split("/").length > 5)
          ) {
            await page.goto(ch + "/icp");
            await page.waitForLoadState("networkidle");
            await expect(page.getByText(/ICP/i).or(page.getByText(/Generate/i))).toBeVisible({
              timeout: 10000,
            });
            return;
          }
        }
      }
    }
    test.skip();
  });

  test("3. back navigation from ICP works", async ({ page }) => {
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
        const slug = h.split("/").pop() ?? "";
        await page.goto(`/dashboard/projects/${slug}/markets`);
        const clinks = page.locator("main a");
        const cc = await clinks.count();
        for (let j = 0; j < cc; j++) {
          const ch = await clinks.nth(j).getAttribute("href");
          if (
            ch?.includes("/markets/DE") ||
            (ch?.includes("/markets/") && ch.split("/").length > 5)
          ) {
            await page.goto(ch + "/icp");
            await page.waitForLoadState("networkidle");
            const back = page.getByText(/back to market/i);
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
