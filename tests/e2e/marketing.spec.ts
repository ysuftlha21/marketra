import { test, expect } from "@playwright/test";

test.describe("Marketing routes", () => {
  test("landing page loads with hero and CTA", async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));

    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Marketra home" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Marketra home" })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Expand into new markets with confidence",
    );
    const heroCta = page
      .locator("section")
      .nth(0)
      .getByRole("link", { name: /Start market research/i });
    const footerCta = page
      .locator("section")
      .filter({ hasText: "Ready to evaluate your next market?" })
      .getByRole("link", { name: /Start market research/i });

    await expect(heroCta).toBeVisible();
    await expect(heroCta).toHaveAttribute("href", "/sign-up");

    await expect(footerCta).toBeVisible();
    await expect(footerCta).toHaveAttribute("href", "/sign-up");

    await expect(page.locator("#how-it-works")).toBeVisible();
    await expect(page.locator("#product")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Company Intelligence", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Decision Maker Research", exact: true }),
    ).toBeVisible();

    const prohibitedCopy = page.getByText(
      /lead database|marketing list|cold email|email scraping|unlimited leads|mass emailing/i,
    );
    await expect(prohibitedCopy).toHaveCount(0);

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBe(false);
    expect(browserErrors).toEqual([]);
  });

  test("pricing page loads with plan cards", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Pricing", level: 1 }).first()).toBeVisible();
    await expect(page.getByText("Growth").first()).toBeVisible();
  });

  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Marketra home" }),
    ).toBeVisible();
  });

  test("sign-up page loads", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Marketra home" }),
    ).toBeVisible();
  });
});
