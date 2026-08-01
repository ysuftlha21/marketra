import { expect, test } from "@playwright/test";

async function expectInsideViewport(
  page: import("@playwright/test").Page,
  locator: import("@playwright/test").Locator,
) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test.describe("dashboard sidebar toggle", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL);
    await page.context().addCookies([{ name: "sidebar:state", value: "false", url: baseURL }]);
  });

  test("desktop open, collapse, persisted reopen, and repeated cycles", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");

    const sidebar = page.locator("#dashboard-sidebar");
    const collapse = page.getByRole("button", { name: "Collapse sidebar" });
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    await expect(sidebar).toBeVisible();
    await expect.poll(async () => (await sidebar.boundingBox())?.width ?? 0).toBeGreaterThan(150);
    await expect(collapse).toBeVisible();
    await expectInsideViewport(page, collapse);
    await page.screenshot({
      path: "tests/screenshots/dashboard-sidebar-open-desktop.png",
      fullPage: false,
    });

    await collapse.click();
    const reopen = page.getByRole("button", { name: "Open sidebar" });
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await expect.poll(async () => (await sidebar.boundingBox())?.width).toBeLessThanOrEqual(80);
    await expect(reopen).toBeVisible();
    await expect(reopen).toHaveAttribute("aria-expanded", "false");
    await expectInsideViewport(page, reopen);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: "tests/screenshots/dashboard-sidebar-collapsed-desktop.png",
      fullPage: false,
    });

    await page.reload();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await page.getByRole("button", { name: "Open sidebar" }).click();
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    await collapse.click();
    await reopen.click();
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    await expect(page.locator("main")).toBeVisible();
  });

  test("tablet keeps the mobile drawer reachable and closable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop");
    await page.setViewportSize({ width: 900, height: 1024 });
    await page.goto("/dashboard");
    const menu = page.getByRole("button", { name: "Open navigation" });
    await expect(menu).toBeVisible();
    await expectInsideViewport(page, menu);
    await menu.click();
    await expect(page.getByRole("dialog", { name: "Dashboard navigation" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Dashboard navigation" })).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });

  test("mobile uses one drawer toggle independently of desktop preference", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile");
    await page.goto("/dashboard");
    const menu = page.getByRole("button", { name: "Open navigation" });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("button", { name: "Open sidebar" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Collapse sidebar" })).toHaveCount(0);
    await menu.click();
    await expect(page.getByRole("dialog", { name: "Dashboard navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close navigation" }).click();
    await expect(page.getByRole("dialog", { name: "Dashboard navigation" })).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });
});
