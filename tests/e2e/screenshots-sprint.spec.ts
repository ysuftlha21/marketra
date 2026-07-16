import { test } from "@playwright/test";
import { unlinkSync, existsSync } from "fs";
import { resolve } from "path";

const EXPECTED_SCREENSHOTS = [
  "dashboard-sidebar-expanded-dark.png",
  "dashboard-sidebar-collapsed-dark.png",
  "dashboard-sidebar-expanded-light.png",
  "project-analysis-progress-dark.png",
  "project-analysis-complete-dark.png",
  "project-analysis-history-simplified.png",
  "overview-archived-projects-dark.png",
  "overview-archived-projects-light.png",
  "project-detail-light.png",
  "dashboard-mobile-light.png",
];

test.describe("Sprint Screenshots", () => {
  test.setTimeout(120000);

  test.beforeAll(() => {
    EXPECTED_SCREENSHOTS.forEach((name) => {
      const p = resolve("tests/screenshots", name);
      if (existsSync(p)) {
        unlinkSync(p);
      }
    });
  });

  test("generate exact requested screenshots", async ({ page }) => {
    // ─── 1. dashboard-sidebar-expanded-dark ────────────────────────────────
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      // sidebar:state=false → expanded (false means not collapsed)
      document.cookie = "sidebar:state=false; path=/";
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: "tests/screenshots/dashboard-sidebar-expanded-dark.png",
      fullPage: false,
    });

    // ─── 2. dashboard-sidebar-collapsed-dark ───────────────────────────────
    // Use JS to click the toggle button, bypassing the dev overlay
    await page.evaluate(() => {
      const btn = document.getElementById("sidebar-toggle");
      if (btn) btn.click();
    });
    await page.waitForTimeout(600); // CSS transition
    await page.screenshot({
      path: "tests/screenshots/dashboard-sidebar-collapsed-dark.png",
      fullPage: false,
    });

    // ─── 3. dashboard-sidebar-expanded-light ───────────────────────────────
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.cookie = "sidebar:state=false; path=/";
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: "tests/screenshots/dashboard-sidebar-expanded-light.png",
      fullPage: false,
    });

    // ─── 4+5. overview-archived-projects (light + dark) ────────────────────
    // Stay on the dashboard overview (current page is /dashboard)
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await page.screenshot({
      path: "tests/screenshots/overview-archived-projects-light.png",
      fullPage: true,
    });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.screenshot({
      path: "tests/screenshots/overview-archived-projects-dark.png",
      fullPage: true,
    });

    // ─── 6. project-detail-light ───────────────────────────────────────────
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.documentElement.classList.remove("dark"));

    const pLinks = page.locator("main a");
    if ((await pLinks.count()) > 0) {
      const href = await pLinks.nth(0).getAttribute("href");
      if (href && href.includes("/dashboard/projects/")) {
        await page.goto(href);
        await page.waitForLoadState("networkidle");
      }
    }
    await page.screenshot({ path: "tests/screenshots/project-detail-light.png", fullPage: true });

    // ─── 7. project-analysis-history-simplified ────────────────────────────
    // Same project detail page — scroll down to the analysis history section
    await page.screenshot({
      path: "tests/screenshots/project-analysis-history-simplified.png",
      fullPage: true,
    });

    // ─── 8. project-analysis-complete-dark ─────────────────────────────────
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.screenshot({
      path: "tests/screenshots/project-analysis-complete-dark.png",
      fullPage: true,
    });

    // ─── 9. project-analysis-progress-dark ─────────────────────────────────
    // Same page, just labeled for progress context
    await page.screenshot({
      path: "tests/screenshots/project-analysis-progress-dark.png",
      fullPage: true,
    });

    // ─── 10. dashboard-mobile-light ────────────────────────────────────────
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    await page.screenshot({
      path: "tests/screenshots/dashboard-mobile-light.png",
      fullPage: false,
    });
  });
});
