import { test, expect } from "@playwright/test";

test.describe("Mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile marketing nav can open", async ({ page }) => {
    await page.goto("/");
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
