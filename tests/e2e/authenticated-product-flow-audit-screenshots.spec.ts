import { mkdir } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const output = "test-results/product-flow-audit";

test("capture audited product navigation", async ({ page }, testInfo) => {
  await mkdir(output, { recursive: true });
  const suffix = testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
  await page.goto("/dashboard");
  if (suffix === "mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();
  await page.screenshot({ path: `${output}/sidebar-${suffix}.png`, fullPage: true });

  await page.goto("/dashboard/projects");
  await expect(page.getByRole("heading", { name: "Your SaaS projects" })).toBeVisible();
  await page.screenshot({ path: `${output}/projects-${suffix}.png`, fullPage: true });

  const marketsResponse = await page.goto("/dashboard/markets");
  expect(marketsResponse?.ok()).toBe(true);
  await expect(page.getByRole("heading", { name: /Target (Markets|countries)/i })).toBeVisible();
  await page.screenshot({ path: `${output}/markets-${suffix}.png`, fullPage: true });

  const campaignsResponse = await page.goto("/dashboard/campaigns");
  expect(campaignsResponse?.ok()).toBe(true);
  await expect(page.getByRole("heading", { name: "Campaign planning" })).toBeVisible();
  await page.screenshot({ path: `${output}/campaigns-${suffix}.png`, fullPage: true });

  await page.goto("/dashboard/crm");
  await expect(page.getByRole("heading", { name: "Lightweight CRM" })).toBeVisible();
  await page.screenshot({ path: `${output}/crm-${suffix}.png`, fullPage: true });
});
