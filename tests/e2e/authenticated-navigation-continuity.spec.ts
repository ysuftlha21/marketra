import { expect, test } from "@playwright/test";

test("Projects, Campaigns and CRM remain reachable from desktop and mobile navigation", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard");
  if (testInfo.project.name === "chromium-mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  const navigation = page.getByRole("navigation", { name: "Dashboard" });
  await expect(navigation.getByRole("link", { name: "Projects" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Campaigns" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "CRM" })).toBeVisible();

  await navigation.getByRole("link", { name: "Projects" }).click();
  await expect(page).toHaveURL(/\/dashboard\/projects$/);
  await expect(page.getByRole("heading", { name: "Your SaaS projects" })).toBeVisible();

  await page.goto("/dashboard/campaigns");
  await expect(page.getByRole("heading", { name: "Campaign planning" })).toBeVisible();
  await page.goto("/dashboard/crm");
  await expect(page.getByRole("heading", { name: "Lightweight CRM" })).toBeVisible();
  await expect(page.getByText("Visible companies", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create project" })).toBeVisible();
});
