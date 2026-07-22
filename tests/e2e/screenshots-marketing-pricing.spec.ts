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
    await expect(page.getByRole("heading", { name: "Growth", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Enterprise", exact: true })).toBeVisible();

    await page.getByRole("button", { name: /^annual/i }).click();
    await expect(page.getByText(/^\$490/)).toBeVisible();
    const growthCta = page.getByRole("link", { name: "Start Free Trial" });
    await expect(growthCta).toHaveAttribute(
      "href",
      "/sign-up?plan=growth&interval=annual&trial=true",
    );
    await growthCta.click();
    await expect(page).toHaveURL(/\/sign-up\?plan=growth&interval=annual&trial=true/);
    await expect(page.getByText(/Selected plan:/)).toContainText("growth · Annual");
    await page.goBack();

    await page.getByRole("button", { name: "Contact Sales" }).click();
    const dialog = page.getByRole("dialog", { name: "Contact Sales" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Work email").fill("buyer@example.com");
    await dialog.getByLabel("Company").fill("Marketra E2E");
    await dialog.getByLabel("Role").fill("Founder");
    await dialog.getByLabel("Team size").fill("10");
    await dialog.getByLabel("Current markets").fill("United States");
    await dialog.getByLabel("Target markets").fill("Germany");
    await dialog.getByLabel("Message").fill("Expansion planning request");
    await dialog.getByRole("button", { name: "Submit request" }).click();
    await expect(dialog.getByText("Sales delivery is not configured yet")).toBeVisible();
    await dialog.getByRole("button", { name: "Close contact sales" }).click();

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
    await expect(page.getByRole("button", { name: /^annual/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Contact Sales" })).toBeVisible();
    await page.screenshot({
      path: "tests/screenshots/pricing-reference-mobile-dark.png",
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
});
