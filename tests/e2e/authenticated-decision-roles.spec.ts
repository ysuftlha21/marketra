import { expect, test, type Page } from "@playwright/test";

const PROJECT_SLUG = "e2e-decision-roles-desktop";
const WORKSPACE_NAME = "E2E Outreach Desktop";

async function switchWorkspace(page: Page, workspaceName: string) {
  await page.goto("/dashboard/settings");
  const switcher = page.getByRole("button", { name: "Switch workspace" });
  if (!(await switcher.textContent())?.includes(workspaceName)) {
    await switcher.click();
    await page.getByRole("menuitemradio", { name: new RegExp(workspaceName) }).click();
    await page.waitForURL(/\/dashboard$/);
    await expect(switcher).toContainText(workspaceName);
    await expect(switcher).toBeEnabled();
    await page.waitForLoadState("networkidle");
  }
}

async function openDecisionRoleFixture(page: Page) {
  await switchWorkspace(page, WORKSPACE_NAME);
  await page.goto(`/dashboard/projects/${PROJECT_SLUG}/markets/US/discovery`);
  const companyLink = page
    .locator(
      `a[href^="/dashboard/projects/${PROJECT_SLUG}/markets/US/discovery/"]:not([href*="/runs/"])`,
    )
    .first();
  await expect(companyLink).toBeVisible();
  await companyLink.click();
  await expect(page.getByRole("heading", { name: /Decision Roles/i })).toBeVisible();
}

async function restorePrimaryWorkspace(page: Page) {
  await page.goto("/dashboard/settings");
  const switcher = page.getByRole("button", { name: "Switch workspace" });
  await switcher.click();
  const primaryWorkspace = page
    .getByRole("menuitemradio")
    .filter({ hasNotText: "E2E Outreach" })
    .first();
  if (
    (await primaryWorkspace.count()) > 0 &&
    (await primaryWorkspace.getAttribute("aria-checked")) !== "true"
  ) {
    const primaryName = (await primaryWorkspace.textContent())?.replace(/owner\s*$/i, "").trim();
    await primaryWorkspace.click();
    await page.waitForURL(/\/dashboard$/);
    if (primaryName) await expect(switcher).toContainText(primaryName);
    await expect(switcher).toBeEnabled();
    await page.waitForLoadState("networkidle");
  } else {
    await page.keyboard.press("Escape");
  }
}

test.describe("Decision Roles (authenticated)", () => {
  test.setTimeout(90_000);
  test.skip(
    ({ isMobile }) => !!isMobile,
    "Decision Role review uses the desktop company-detail layout in this suite",
  );
  test.afterEach(async ({ page }) => {
    await restorePrimaryWorkspace(page);
  });

  test("1. full generation and review workflow", async ({ page }) => {
    await openDecisionRoleFixture(page);

    const generateButton = page.getByRole("button", {
      name: /Discover Decision Makers|Generate Roles/i,
    });
    await expect(generateButton).toBeVisible();
    await generateButton.click();
    await expect(page.getByText(/Analyzing buying committee/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("heading", { name: /VP of Engineering/i })).toBeVisible({
      timeout: 15000,
    });

    const approveButton = page.getByRole("button", { name: /Approve/i }).first();
    await approveButton.click();
    await expect(page.getByText(/Approved/i).first()).toBeVisible();

    const primaryButton = page.getByRole("button", { name: /Set Primary/i }).first();
    await primaryButton.click();
    await expect(page.getByText(/Primary/i).first()).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: /VP of Engineering/i })).toBeVisible({
      timeout: 15000,
    });

    const historyButton = page.getByRole("button", { name: /History/i });
    await historyButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("2. generated roles persist in the project-scoped fixture", async ({ page }) => {
    await openDecisionRoleFixture(page);
    await expect(page.getByRole("heading", { name: /VP of Engineering/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/Approved/i).first()).toBeVisible();
  });
});
