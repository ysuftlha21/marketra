import { test, expect } from "@playwright/test";

test.describe("Sign out", () => {
  test("sign out clears session and redirects to sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    // Wait for the hydrated menu before targeting its item; the header also contains settings UI.
    await page.getByRole("button", { name: /User menu/i }).click();
    const userMenu = page.getByRole("menu", { name: "User" });
    await expect(userMenu).toBeVisible();
    await userMenu.getByRole("menuitem", { name: /Sign out/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    // Verify protected route redirects after sign-out
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
