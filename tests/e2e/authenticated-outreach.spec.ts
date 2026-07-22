import { expect, test, type Page, type TestInfo } from "@playwright/test";

const RAW_DIAGNOSTICS = ["SELECT * FROM", "sk-live", "provider response text", "at worker.ts"];

function onlyProject(testInfo: TestInfo, name: string) {
  test.skip(testInfo.project.name !== name, `${name} only`);
}

async function getWorkspaceSwitcher(page: Page) {
  let switcher = page.getByRole("button", { name: "Switch workspace" });
  if ((await switcher.count()) === 0) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    switcher = page.getByRole("button", { name: "Switch workspace" });
  }
  await expect(switcher).toBeVisible();
  return switcher;
}

async function openCompany(page: Page, projectSlug: string) {
  const workspaceName = projectSlug.includes("-mobile-")
    ? "E2E Outreach Mobile"
    : projectSlug.includes("-state-")
      ? "E2E Outreach States"
      : "E2E Outreach Desktop";
  await page.goto("/dashboard/settings");
  const switcher = await getWorkspaceSwitcher(page);
  if (!(await switcher.textContent())?.includes(workspaceName)) {
    await switcher.click();
    await page.getByRole("menuitemradio", { name: new RegExp(workspaceName) }).click();
    await page.waitForURL(/\/dashboard$/);
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
}

async function restorePrimaryWorkspace(page: Page) {
  await page.goto("/dashboard/settings");
  const switcher = await getWorkspaceSwitcher(page);
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
    await page.waitForLoadState("networkidle");
  } else {
    await page.keyboard.press("Escape");
  }
}

function monitorBrowserHealth(page: Page) {
  const issues: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (
      url.origin === new URL(page.url() || "http://localhost:3000").origin &&
      response.status() >= 400
    ) {
      issues.push(`response ${response.status()}: ${url.pathname}`);
    }
  });
  return () => expect(issues, issues.join("\n")).toEqual([]);
}

async function expectClipboard(page: Page, buttonName: string, expected: RegExp) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: buttonName }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(expected);
}

test.describe("Phase 8.2 Outreach browser verification", () => {
  test.setTimeout(120_000);
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== "skipped") await restorePrimaryWorkspace(page);
  });

  test("desktop email workflow completes without a page reload", async ({ page }, testInfo) => {
    onlyProject(testInfo, "chromium-desktop");
    const assertHealthy = monitorBrowserHealth(page);
    await openCompany(page, "e2e-outreach-desktop-empty");

    const decisionHeading = page.getByText("Decision Maker Intelligence", { exact: true });
    const outreachHeading = page.getByRole("heading", { name: "Outreach Intelligence" });
    expect(await decisionHeading.boundingBox()).not.toBeNull();
    expect((await outreachHeading.boundingBox())!.y).toBeGreaterThan(
      (await decisionHeading.boundingBox())!.y,
    );

    await expect(page.getByRole("heading", { name: "Generate Outreach Draft" })).toBeVisible();
    await expect(page.getByText("Outreach:")).toContainText("0 / 10");

    const roleOptions = await page.locator("#og-role option:not([disabled])").allTextContents();
    expect(roleOptions[0]).toContain("Chief Technology Officer");
    expect(roleOptions[1]).toContain("Chief Information Security Officer");
    expect(roleOptions[2]).toContain("VP Engineering");

    await page.locator("#og-channel").selectOption("linkedin_connection");
    await expect(page.locator("#og-msg-type")).toHaveValue("connection_request");
    await expect(page.locator("#og-length")).toHaveValue("short");
    await expect(page.locator("#og-length")).toBeDisabled();
    await page.locator("#og-channel").selectOption("email");

    await page.locator("#og-objective").fill("Introduce workflow automation to the technical team");
    await page.getByRole("button", { name: "Generate outreach draft" }).click();
    await expect(page.getByText("Generating outreach…")).toBeVisible();
    await expect(page.getByText("Outreach draft generated successfully.")).toBeVisible({
      timeout: 15_000,
    });

    const subject = page.getByRole("button", { name: "Copy subject" }).locator("..");
    const body = page.locator(".whitespace-pre-wrap");
    await expect(subject).toContainText("Northstar Desktop");
    await expect(body).toContainText("Northstar Desktop");
    await expectClipboard(page, "Copy subject", /.+/);
    await expectClipboard(page, "Copy body", /Northstar Desktop/);
    await expectClipboard(page, "Copy full message", /Subject:|Northstar Desktop/);

    await page.reload();
    await expect(page.getByRole("heading", { name: "Generated Draft" })).toBeVisible();
    await expect(page.locator(".whitespace-pre-wrap")).toContainText("Northstar Desktop");
    assertHealthy();
  });

  test("desktop LinkedIn workflow enforces supported combinations", async ({ page }, testInfo) => {
    onlyProject(testInfo, "chromium-desktop");
    const assertHealthy = monitorBrowserHealth(page);
    await openCompany(page, "e2e-outreach-desktop-linkedin-empty");

    await page.locator("#og-channel").selectOption("linkedin_connection");
    await expect(page.locator("#og-msg-type option")).toHaveCount(1);
    await expect(page.locator("#og-msg-type option")).toHaveText("Connection Request");
    await expect(page.locator("#og-length")).toHaveValue("short");
    await expect(page.locator("#og-length")).toBeDisabled();

    await page
      .locator("#og-objective")
      .fill("Connect with the technical leader about workflow automation");
    await page.getByRole("button", { name: "Generate outreach draft" }).click();
    await expect(page.getByText("Outreach draft generated successfully.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Connection Message")).toBeVisible();
    await expect(page.getByText("Subject", { exact: true })).toHaveCount(0);
    await expect(page.locator(".whitespace-pre-wrap")).toContainText(
      "Northstar LinkedIn Generation",
    );
    assertHealthy();
  });

  test("persisted progress run renders and polls safely", async ({ page }, testInfo) => {
    onlyProject(testInfo, "chromium-outreach-states");
    const assertHealthy = monitorBrowserHealth(page);
    await openCompany(page, "e2e-outreach-state-progress");
    await expect(page.getByText("Generating outreach…")).toBeVisible();
    await expect(page.getByText("Generating outreach draft", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Generated Draft" })).toHaveCount(0);
    await page.waitForTimeout(3_500);
    assertHealthy();
  });

  test("persisted failure exposes only the controlled message", async ({ page }, testInfo) => {
    onlyProject(testInfo, "chromium-outreach-states");
    const assertHealthy = monitorBrowserHealth(page);
    await openCompany(page, "e2e-outreach-state-failed");
    await expect(page.getByText("Outreach provider unavailable.")).toBeVisible();
    for (const diagnostic of RAW_DIAGNOSTICS) {
      await expect(page.getByText(diagnostic, { exact: false })).toHaveCount(0);
    }
    await expect(page.getByRole("button", { name: /retry|generate/i })).toHaveCount(0);
    assertHealthy();
  });

  test("usage limit blocks generation", async ({ page }, testInfo) => {
    onlyProject(testInfo, "chromium-outreach-states");
    await openCompany(page, "e2e-outreach-state-limit");
    await expect(page.getByText("Outreach:")).toContainText("10 / 10");
    await expect(page.getByText("Limit reached", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Outreach limit reached" })).toBeDisabled();
  });

  test("no-approved-role state prevents generation clearly", async ({ page }, testInfo) => {
    onlyProject(testInfo, "chromium-outreach-states");
    await openCompany(page, "e2e-outreach-state-no-role");
    await expect(page.getByText("No approved decision-maker role is available yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: /generate outreach/i })).toHaveCount(0);
  });

  test("mobile company Outreach remains usable without overflow", async ({ page }, testInfo) => {
    onlyProject(testInfo, "chromium-mobile");
    const assertHealthy = monitorBrowserHealth(page);
    await openCompany(page, "e2e-outreach-mobile-empty");
    await expect(page.getByText("Outreach:")).toContainText("0 / 10");

    await page.locator("#og-objective").fill("Introduce workflow automation from the mobile view");
    const generateButton = page.getByRole("button", { name: "Generate outreach draft" });
    await generateButton.scrollIntoViewIfNeeded();
    await expect(generateButton).toBeInViewport();
    await generateButton.click();
    await expect(page.getByText("Outreach draft generated successfully.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(".whitespace-pre-wrap")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy full message" })).toBeVisible();
    await expectClipboard(page, "Copy full message", /Northstar Mobile/);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    assertHealthy();
  });
});
