import { expect, test } from "@playwright/test";

test("Markets workspace remains actionable and overflow-free on desktop and mobile", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard/projects/new");
  await page.getByLabel("Project name").fill(`Markets Workspace ${Date.now()}`);
  await page
    .getByLabel("Product description")
    .fill(
      "A complete product description for validating the Marketra market intelligence workspace.",
    );
  await page.getByRole("button", { name: /create project/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects\/(?!new$)[a-z0-9-]+$/, { timeout: 15000 });
  const projectSlug = page.url().split("/").pop() ?? "";
  await page.goto(`/dashboard/projects/${projectSlug}/markets`);
  await page.getByLabel("Target country").selectOption("US");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByRole("heading", { name: "Markets", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Projects" })).toBeVisible();
  if (testInfo.project.name === "chromium-mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("dialog").getByRole("link", { name: "Markets", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
  } else {
    await expect(
      page
        .getByRole("navigation", { name: "Dashboard" })
        .first()
        .getByRole("link", { name: "Markets", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  }
  await expect(page.getByLabel("World map of selected target markets")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search markets" })).toBeVisible();
  await expect(page.getByLabel("Region")).toBeVisible();
  await expect(page.getByLabel("Opportunity")).toBeVisible();

  await page.getByRole("searchbox", { name: "Search markets" }).fill("United States");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/q=United(?:\+|%20)States/);
  await expect(page.getByRole("heading", { name: "United States", exact: true })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
