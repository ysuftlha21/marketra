import { expect, test, type Page } from "@playwright/test";

function failOnUnexpectedBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

test.describe("Phase 9 production-readiness surfaces", () => {
  test("onboarding is resumable and exposes one deterministic next action", async ({ page }) => {
    const assertNoBrowserErrors = failOnUnexpectedBrowserErrors(page);
    await page.goto("/dashboard/onboarding");
    await expect(
      page.getByRole("heading", { name: /reach your first useful result/i }),
    ).toBeVisible();
    await expect(page.getByText(/progress is derived from saved workspace data/i)).toBeVisible();
    expect(await page.getByRole("link", { name: /continue/i }).count()).toBeLessThanOrEqual(1);
    assertNoBrowserErrors();
  });

  test("billing shows the authoritative free fallback and usage limits", async ({ page }) => {
    const assertNoBrowserErrors = failOnUnexpectedBrowserErrors(page);
    await page.goto("/dashboard/settings/billing");
    await expect(page.getByRole("heading", { name: /billing and usage/i })).toBeVisible();
    await expect(page.getByText("Billing setup is not available yet.")).toBeVisible();
    await expect(page.getByText("AI operations")).toBeVisible();
    assertNoBrowserErrors();
  });
});
