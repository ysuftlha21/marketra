import { test, expect } from "@playwright/test";

test.describe("Marketing routes", () => {
  test("landing page loads with hero and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Compare markets before you commit",
    );
    const heroCta = page
      .locator("section")
      .nth(0)
      .getByRole("link", { name: /Start free/i });
    const footerCta = page
      .locator("section")
      .filter({ hasText: "Ready to compare markets?" })
      .getByRole("link", { name: /Start free/i });

    await expect(heroCta).toBeVisible();
    await expect(heroCta).toHaveAttribute("href", "/sign-up");

    await expect(footerCta).toBeVisible();
    await expect(footerCta).toHaveAttribute("href", "/sign-up");
  });

  test("pricing page loads with plan cards", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Pricing", level: 1 }).first()).toBeVisible();
    await expect(page.getByText("Growth").first()).toBeVisible();
  });

  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("sign-up page loads", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });
});
