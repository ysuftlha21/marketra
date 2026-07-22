import { test, expect } from "@playwright/test";

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
  });

  test("allows access to sign-up page without auth", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });

  test("allows access to pricing page without auth", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Pricing", exact: true })).toBeVisible();
  });
});
