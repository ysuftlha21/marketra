import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

async function expectSharedHeaderBrand(page: import("@playwright/test").Page) {
  const header = page.getByRole("banner");
  const brand = header.getByRole("link", { name: "Marketra home" });

  await expect(brand).toHaveCount(1);
  await expect(brand).toBeVisible();
  await expect(brand).toHaveAttribute("href", "/");
  await expect(brand.locator('img[alt="Marketra"]:visible')).toHaveCount(1);
  await expect(page.locator("html")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => document.documentElement.clientWidth),
  );
}

async function expectBrandInsideViewport(page: import("@playwright/test").Page) {
  const brand = page.getByRole("banner").getByRole("link", { name: "Marketra home" });
  const viewport = page.viewportSize();
  const box = await brand.boundingBox();
  const styles = await brand.evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      display: computed.display,
      opacity: Number.parseFloat(computed.opacity),
      visibility: computed.visibility,
    };
  });

  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();
  if (!viewport || !box) throw new Error("Expected a visible brand inside a real viewport.");
  expect(styles.display).not.toBe("none");
  expect(styles.opacity).toBeGreaterThan(0);
  expect(styles.visibility).toBe("visible");
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

  const visibleLogo = brand.locator('img[alt="Marketra"]:visible');
  await expect(visibleLogo).toHaveCount(1);
  await expect(visibleLogo).toHaveJSProperty("complete", true);
  await expect(visibleLogo).not.toHaveAttribute("src", /_next\/image/);
}

test.describe("Unauthenticated access", () => {
  test("redirects to sign-in when accessing dashboard without auth", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("redirects to sign-in when accessing settings without auth", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("allows access to marketing pages without auth", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Compare markets before you commit/i }),
    ).toBeVisible();
  });

  test("allows access to sign-in page without auth", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expectSharedHeaderBrand(page);
  });

  test("keeps the real sign-in brand visible and unclipped in the header", async ({
    page,
  }, testInfo) => {
    const mobile = testInfo.project.name.includes("mobile");
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
    await page.goto("/sign-in");

    await expectBrandInsideViewport(page);

    await page.screenshot({
      path: resolve(
        "tests/screenshots",
        mobile ? "sign-in-header-mobile.png" : "sign-in-header-desktop.png",
      ),
      clip: {
        x: 0,
        y: 0,
        width: mobile ? 390 : 1440,
        height: 96,
      },
    });

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expectBrandInsideViewport(page);

    if (!mobile) {
      await page.setViewportSize({ width: 768, height: 1024 });
      await expectBrandInsideViewport(page);
      await expect(page.locator("html")).toHaveJSProperty(
        "scrollWidth",
        await page.evaluate(() => document.documentElement.clientWidth),
      );
    }
  });

  test("allows access to sign-up page without auth", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expectSharedHeaderBrand(page);
  });

  test("renders the email confirmation handoff without exposing the full recipient", async ({
    page,
  }) => {
    await page.goto("/sign-up/check-email?email=founder%40example.com");
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByText("fo•••••@example.com")).toBeVisible();
    await expect(page.getByText("founder@example.com")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Resend available in 60s" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Change email" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  test("allows access to pricing page without auth", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Pricing", exact: true })).toBeVisible();
  });
});
