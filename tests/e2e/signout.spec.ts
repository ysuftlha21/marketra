import { test, expect } from "@playwright/test";

test.describe("Sign out", () => {
  test("sign out clears session and redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    // The sign-out menuitem is inside the "User menu" dropdown (rendered as menu role)
    await page.getByRole("button", { name: /User menu/i }).click();
    await page.getByRole("menuitem", { name: /Sign out/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    // Verify protected route redirects after sign-out
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
