import { expect, test, type Page } from "@playwright/test";

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("Landing problem section", () => {
  test("matches the desktop composition", async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 1920, height: 1200 });
    await page.goto("/#problem");
    const section = page.locator("#problem");
    await expect(section).toBeVisible();
    await expect(section.getByRole("heading", { name: "Wrong Market" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Wrong Customers" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Generic Outreach" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Without Marketra" })).toBeVisible();
    await expect(section.getByRole("heading", { name: "With Marketra" })).toBeVisible();
    await section.screenshot({ path: "tests/screenshots/problem-reference-1920-dark.png" });
    expect(errors).toEqual([]);
  });

  test("stacks cleanly at mobile width", async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#problem");
    const section = page.locator("#problem");
    await expect(section.getByRole("heading", { name: "Wrong Market" })).toBeVisible();
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
    await section.screenshot({ path: "tests/screenshots/problem-reference-mobile-dark.png" });
    expect(errors).toEqual([]);
  });
});
