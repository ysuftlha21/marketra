import { expect, test, type Page } from "@playwright/test";

function monitorPageHealth(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
}

test("Marketra dashboard matches its responsive reference", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "chromium-mobile";
  const errors = monitorPageHealth(page);
  if (!mobile) await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/dashboard?demo=1");

  await expect(page.getByRole("heading", { name: "Select a Market" })).toBeVisible();
  await expect(page.getByText("AI Strategy")).toBeVisible();
  await expect(page.getByText("Top Market Opportunities")).toBeVisible();
  await expect(page.getByText("Performance Overview")).toBeVisible();

  if (mobile) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Dashboard navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close navigation" }).click();
    await page.screenshot({
      path: "tests/screenshots/dashboard-reference-mobile-dark.png",
      fullPage: true,
      animations: "disabled",
    });
  } else {
    const search = page.getByLabel("Search dashboard");
    await search.focus();
    await expect(search).toBeFocused();
    await search.fill("Germany");
    await expect(page.getByText("No matching workspace data.")).toBeVisible();
    await search.fill("");
    await search.blur();

    const countryButton = page.getByRole("button", { name: /United States/ }).first();
    await countryButton.click();
    await page.getByRole("option", { name: "Germany" }).click();
    await expect(page.getByRole("button", { name: /Germany/ }).first()).toBeVisible();
    await page.getByRole("button", { name: "Germany", exact: true }).click();
    await page.getByRole("option", { name: "United States" }).click();

    const japan = page.getByRole("button", { name: /Japan/ });
    await japan.focus();
    await expect(japan).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: /Germany/ })
      .last()
      .click();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Zoom out" }).click();
    await page.getByLabel("Performance period").selectOption({ label: "Last 3 Months" });
    await page.getByLabel("Performance period").selectOption({ label: "Last 6 Months" });
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      window.scrollTo({ top: 0, behavior: "instant" });
    });

    await page.screenshot({
      path: "tests/screenshots/dashboard-reference-1536-dark.png",
      fullPage: false,
      animations: "disabled",
    });
  }
  expect(errors).toEqual([]);
});
