import { test } from "@playwright/test";

test.describe("Marketing screenshots", () => {
  test("screenshot landing desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/landing-desktop.png", fullPage: true });
  });

  test("screenshot landing mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/landing-mobile.png", fullPage: true });
  });

  test("screenshot pricing", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/pricing.png", fullPage: true });
  });

  test("screenshot sign-in", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "tests/screenshots/sign-in.png", fullPage: true });
  });
});
