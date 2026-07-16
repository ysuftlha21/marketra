import { expect, test, type Page, type TestInfo } from "@playwright/test";

function onlyProject(testInfo: TestInfo, name: string) {
  test.skip(testInfo.project.name !== name, `${name} only`);
}

async function openCompany(page: Page, projectSlug: string) {
  const workspaceName = projectSlug.includes("-mobile-")
    ? "E2E Outreach Mobile"
    : projectSlug.includes("-state-")
      ? "E2E Outreach States"
      : "E2E Outreach Desktop";
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
  await page.goto(`/dashboard/projects/${projectSlug}/markets/US/discovery`);
  await page.waitForLoadState("networkidle");
  const companyLink = page
    .locator(
      `a[href^="/dashboard/projects/${projectSlug}/markets/US/discovery/"]:not([href*="/runs/"])`,
    )
    .first();
  await expect(companyLink).toBeVisible();
  await companyLink.click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Outreach Intelligence" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
  });
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

async function setScheme(page: Page, scheme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: scheme });
  const targetButton = page.getByRole("button", {
    name: scheme === "dark" ? "Switch to dark theme" : "Switch to light theme",
  });
  if (await targetButton.isVisible().catch(() => false)) {
    await targetButton.click();
  }
  await expect(page.locator("html")).toHaveClass(scheme === "dark" ? /dark/ : /light/);
}

test.describe("Phase 8.2 Outreach screenshots", () => {
  test.setTimeout(120_000);
  test.afterEach(async ({ page }, testInfo) => {
    if (!testInfo.skipped) await restorePrimaryWorkspace(page);
  });

  test("desktop screenshots", async ({ page }, testInfo) => {
    onlyProject(testInfo, "chromium-desktop");

    await openCompany(page, "e2e-outreach-desktop-screenshot-empty");
    await setScheme(page, "dark");
    const outreachHeading = page.getByRole("heading", { name: "Outreach Intelligence" });
    await outreachHeading.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "tests/screenshots/outreach-empty-dark.png",
      fullPage: true,
    });
    await page.getByRole("heading", { name: "Generate Outreach Draft" }).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "tests/screenshots/outreach-form-dark.png",
      fullPage: true,
    });

    await openCompany(page, "e2e-outreach-desktop-email");
    await setScheme(page, "dark");
    await expect(page.getByRole("heading", { name: "Generated Draft" })).toBeVisible();
    await page.screenshot({
      path: "tests/screenshots/outreach-email-result-dark.png",
      fullPage: true,
    });
    await setScheme(page, "light");
    await page.screenshot({
      path: "tests/screenshots/outreach-email-result-light.png",
      fullPage: true,
    });

    await openCompany(page, "e2e-outreach-desktop-linkedin");
    await setScheme(page, "dark");
    await expect(page.getByText("Connection Message")).toBeVisible();
    await page.screenshot({
      path: "tests/screenshots/outreach-linkedin-result-dark.png",
      fullPage: true,
    });
  });

  test("persisted state screenshots", async ({ page }, testInfo) => {
    onlyProject(testInfo, "chromium-outreach-states");

    await openCompany(page, "e2e-outreach-state-progress");
    await setScheme(page, "dark");
    await expect(page.getByText("Generating outreach draft", { exact: true })).toBeVisible();
    await page.screenshot({
      path: "tests/screenshots/outreach-progress-dark.png",
      fullPage: true,
    });

    await openCompany(page, "e2e-outreach-state-limit");
    await setScheme(page, "light");
    await expect(page.getByText("Limit reached", { exact: true })).toBeVisible();
    await page.screenshot({
      path: "tests/screenshots/outreach-usage-limit-light.png",
      fullPage: true,
    });

    await openCompany(page, "e2e-outreach-state-no-role");
    await expect(page.getByText("No approved decision-maker role is available yet.")).toBeVisible();
    await page.screenshot({
      path: "tests/screenshots/outreach-no-approved-role.png",
      fullPage: true,
    });

    await openCompany(page, "e2e-outreach-state-failed");
    await expect(page.getByText("Outreach provider unavailable.")).toBeVisible();
    await page.screenshot({
      path: "tests/screenshots/outreach-failed-state.png",
      fullPage: true,
    });
  });

  test("mobile screenshot", async ({ page }, testInfo) => {
    onlyProject(testInfo, "chromium-mobile");
    await openCompany(page, "e2e-outreach-mobile-result");
    await setScheme(page, "light");
    await expect(page.getByRole("heading", { name: "Generated Draft" })).toBeVisible();
    await page.screenshot({
      path: "tests/screenshots/outreach-mobile-light.png",
      fullPage: true,
    });
  });
});
