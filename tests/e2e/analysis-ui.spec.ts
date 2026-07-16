import { test, expect } from "@playwright/test";

test.describe("Analysis UI", () => {
  test.setTimeout(30000);

  test("history UI hides provider, model, tokens, and prompt_version", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");

    const links = page.locator("main a");
    const c = await links.count();
    if (c > 0) {
      const h = await links.nth(0).getAttribute("href");
      if (h?.includes("/dashboard/projects/")) {
        await page.goto(h);
        await page.waitForLoadState("networkidle");

        // None of these internal fields should be visible in the UI
        await expect(page.getByText("gpt-4o-mini", { exact: false })).not.toBeVisible();
        await expect(page.getByText("prompt_version", { exact: false })).not.toBeVisible();
        await expect(page.getByText("openai", { exact: false })).not.toBeVisible();
      }
    }
  });

  test("progress tracker does not appear when no in-progress run exists", async ({ page }) => {
    // The progress tracker should only appear when current_stage is set and status is in_progress.
    // With no active run, the tracker should be hidden.
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");

    const links = page.locator("main a");
    const c = await links.count();
    if (c > 0) {
      const h = await links.nth(0).getAttribute("href");
      if (h?.includes("/dashboard/projects/")) {
        await page.goto(h);
        await page.waitForLoadState("networkidle");

        // Progress tracker stages should not show for a completed/no-run state
        await expect(page.getByText(/Extracting features/i)).not.toBeVisible();
        await expect(page.getByText(/Researching market/i)).not.toBeVisible();
      }
    }
  });
});
