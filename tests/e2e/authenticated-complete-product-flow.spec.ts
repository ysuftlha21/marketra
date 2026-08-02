import { mkdir } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const output = "test-results/product-flow-audit";

function fixture(testInfo: TestInfo) {
  const mobile = testInfo.project.name === "chromium-mobile";
  return {
    workspace: mobile ? "E2E Outreach Mobile" : "E2E Outreach Desktop",
    projectSlug: mobile ? "e2e-outreach-mobile-empty" : "e2e-outreach-desktop-empty",
    projectName: mobile ? "E2E-OUTREACH-MOBILE Empty" : "E2E-OUTREACH-DESKTOP Empty",
    switchSlug: mobile ? "e2e-outreach-mobile-result" : "e2e-outreach-desktop-email",
    switchName: mobile ? "E2E-OUTREACH-MOBILE Result" : "E2E-OUTREACH-DESKTOP Email Result",
    company: mobile ? "Northstar Mobile" : "Northstar Desktop",
    suffix: mobile ? "mobile" : "desktop",
  };
}

async function openNavigationIfNeeded(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    const button = page.getByRole("button", { name: "Open navigation" });
    if (await button.isVisible()) await button.click();
  }
}

async function selectWorkspaceAndProject(page: Page, testInfo: TestInfo) {
  const state = fixture(testInfo);
  await page.goto("/dashboard/settings");
  await openNavigationIfNeeded(page);
  const workspace = page.getByRole("button", { name: "Switch workspace" });
  if (!(await workspace.textContent())?.includes(state.workspace)) {
    await workspace.click();
    await page.getByRole("menuitemradio", { name: new RegExp(state.workspace) }).click();
    await page.waitForURL(/\/dashboard$/);
  }
  await page.goto("/dashboard");
  await openNavigationIfNeeded(page);
  await selectActiveProject(page, state.projectName, state.projectSlug);
  return state;
}

async function selectActiveProject(page: Page, label: string, slug: string) {
  const project = page.getByRole("combobox", { name: "Active project" });
  await project.selectOption({ label });
  await expect
    .poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.find((cookie) => cookie.name === "marketra:active-project")?.value;
    })
    .toBe(slug);
}

async function restorePrimaryWorkspace(page: Page) {
  await page.goto("/dashboard/settings");
  await openNavigationIfNeeded(page);
  const switcher = page.getByRole("button", { name: "Switch workspace" });
  await expect(switcher).toBeVisible();
  await switcher.click();
  const primaryWorkspace = page
    .getByRole("menuitemradio")
    .filter({ hasNotText: "E2E Outreach" })
    .first();
  if (
    (await primaryWorkspace.count()) > 0 &&
    (await primaryWorkspace.getAttribute("aria-checked")) !== "true"
  ) {
    await primaryWorkspace.click();
    await page.waitForURL(/\/dashboard$/);
  } else {
    await page.keyboard.press("Escape");
  }
}

test.describe("complete project-to-analytics continuity", () => {
  test.setTimeout(120_000);
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== "skipped") await restorePrimaryWorkspace(page);
  });

  test("uses one active project context through every production feature", async ({
    page,
  }, testInfo) => {
    await mkdir(output, { recursive: true });
    const state = await selectWorkspaceAndProject(page, testInfo);

    await page.goto("/dashboard/projects");
    await expect(page.getByRole("link", { name: state.projectName })).toBeVisible();

    await page.goto("/dashboard/markets");
    await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${state.projectSlug}/markets$`));
    await expect(page.getByRole("link", { name: /United States \(US\)/ })).toBeVisible();

    await page.goto(`/dashboard/projects/${state.projectSlug}/markets/US`);
    await expect(page.getByRole("heading", { name: /United States/ })).toBeVisible();
    await page.screenshot({
      path: `${output}/market-analysis-ready-${state.suffix}.png`,
      fullPage: true,
    });

    await page.goto(`/dashboard/projects/${state.projectSlug}/markets/US/icp`);
    await expect(page.getByText("approved", { exact: true })).toBeVisible();
    await expect(page.getByText(/Deterministic browser-test ICP/)).toBeVisible();
    await page.screenshot({
      path: `${output}/country-icp-ready-${state.suffix}.png`,
      fullPage: true,
    });

    await page.goto(`/dashboard/projects/${state.projectSlug}/markets/US/discovery`);
    await expect(page.getByRole("form", { name: "Company discovery filters" })).toBeVisible();
    await expect(page.getByText(state.company, { exact: true })).toBeVisible();
    await page.screenshot({
      path: `${output}/company-discovery-ready-${state.suffix}.png`,
      fullPage: true,
    });

    const company = page
      .locator(
        `a[href^="/dashboard/projects/${state.projectSlug}/markets/US/discovery/"]:not([href*="/runs/"])`,
      )
      .first();
    await company.click();
    await expect(page.getByRole("heading", { name: "Outreach Intelligence" })).toBeVisible();
    const generate = page.getByRole("button", { name: "Generate outreach draft" });
    if (await generate.isVisible()) {
      await page
        .locator("#og-objective")
        .fill("Introduce workflow automation to the technical team");
      await generate.click();
      await expect(page.getByText("Outreach draft generated successfully.")).toBeVisible({
        timeout: 15_000,
      });
    }
    await expect(page.getByRole("heading", { name: "Generated Draft" })).toBeVisible();
    const approve = page.getByRole("button", { name: "Approve" });
    if (await approve.isVisible()) await approve.click();

    await page.goto("/dashboard/campaigns");
    await expect(page.getByRole("heading", { name: "Campaign planning" })).toBeVisible();
    await expect(page.getByText("Sending unavailable", { exact: true })).toBeVisible();

    await page.goto("/dashboard/crm");
    await expect(page.getByText(state.company, { exact: true })).toBeVisible();
    await expect(
      page.getByLabel("CRM pipeline entries").getByText("Outreach pending", { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: `${output}/crm-ready-${state.suffix}.png`, fullPage: true });

    await page.goto("/dashboard/analytics");
    await expect(
      page
        .getByRole("region", { name: "Project metrics" })
        .or(page.locator('[aria-label="Project metrics"]')),
    ).toBeVisible();
    await expect(page.getByText("Saved companies", { exact: true })).toBeVisible();
    await page.screenshot({
      path: `${output}/complete-ready-flow-${state.suffix}.png`,
      fullPage: true,
    });

    await page.goto("/dashboard");
    await openNavigationIfNeeded(page);
    await selectActiveProject(page, state.switchName, state.switchSlug);
    await page.goto("/dashboard/crm");
    await expect(page.getByText(state.company, { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(state.company, { exact: true })).toHaveCount(0);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});
