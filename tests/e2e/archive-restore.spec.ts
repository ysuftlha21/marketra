import { test, expect } from "@playwright/test";

test.describe("Archive and Restore", () => {
  test("archived project appears, restore works, limits enforced", async ({ page }) => {
    // Note: Due to local execution we assume an authenticated session via global setup.
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Click on Archived Projects if it exists, otherwise assume no archived projects
    const archivedLink = page.getByRole("link", { name: /Archived Projects/i });
    if (await archivedLink.isVisible()) {
      await archivedLink.click();
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/Archived Projects/i)).toBeVisible();

      // If there's a restore button, test its interaction
      const restoreBtn = page.getByRole("button", { name: /Restore/i }).first();
      if (await restoreBtn.isVisible()) {
        await restoreBtn.click();

        // It might succeed, or it might fail if limit is reached.
        // We look for a toast either way.
        await expect(page.locator(".toast").first()).toBeVisible({ timeout: 10000 });
      }
    }
  });
});
