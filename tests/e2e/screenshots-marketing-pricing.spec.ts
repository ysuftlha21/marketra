import { expect, test, type Page } from "@playwright/test";

function monitorBrowserHealth(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("Pricing experience", () => {
  test("desktop pricing interactions and routes are complete", async ({ page }) => {
    const errors = monitorBrowserHealth(page);
    await page.setViewportSize({ width: 1536, height: 1024 });
    await page.goto("/pricing");
    await expect(
      page.getByRole("heading", { name: "Simple pricing. Scale globally." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Starter", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Growth", exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^yearly/i }).click();
    await expect(page.getByText(/^\$290/)).toBeVisible();
    await expect(page.getByText(/^\$790/)).toBeVisible();
    await expect(page.getByText(/^\$1990/)).toBeVisible();
    const proCta = page.getByRole("link", { name: "Start Free Trial" }).nth(1);
    await expect(proCta).toHaveAttribute("href", "/sign-up?plan=growth&interval=annual&trial=true");
    await proCta.click();
    await expect(page).toHaveURL(/\/sign-up\?plan=growth&interval=annual&trial=true/);
    await expect(page.getByText(/Selected plan:/)).toContainText("growth · Annual");
    await page.goBack();

    const faq = page.getByRole("button", { name: "Do you offer annual pricing?" });
    await faq.click();
    await expect(faq).toHaveAttribute("aria-expanded", "true");
    await page.screenshot({
      path: "tests/screenshots/pricing-reference-1536-dark.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });

  test("mobile pricing remains usable without horizontal overflow", async ({ page }) => {
    const errors = monitorBrowserHealth(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Growth", exact: true })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    await expect(page.getByRole("button", { name: /^yearly/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start Free Trial" }).first()).toBeVisible();
    await page.screenshot({
      path: "tests/screenshots/pricing-reference-mobile-dark.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
});
