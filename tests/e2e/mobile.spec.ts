import { test, expect } from "@playwright/test";

test.describe("Mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile marketing nav can open", async ({ page }) => {
    await page.goto("/");
    const brand = page.getByRole("banner").getByRole("link", { name: "Marketra home" });
    await expect(brand).toHaveCount(1);
    await expect(brand).toBeVisible();
    await expect(page.locator("html")).toHaveJSProperty(
      "scrollWidth",
      await page.evaluate(() => document.documentElement.clientWidth),
    );
    const toggle = page.getByRole("button", { name: "Toggle menu" });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole("navigation", { name: "Mobile marketing" })).toBeVisible();
  });

  test("mobile dashboard nav redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
