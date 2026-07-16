import { test, expect } from "@playwright/test";

test.describe("Sidebar", () => {
  test.setTimeout(60000);

  test("expanded state, collapsed state, and cookie persistence", async ({ page, context }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Force expanded state via cookie
    await page.evaluate(() => {
      document.cookie = "sidebar:state=false; path=/"; // false = not collapsed = expanded
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside[data-state]").first();

    // Should be expanded
    await expect(sidebar).toHaveAttribute("data-state", "expanded");

    // Collapse via JS click (bypasses Next.js dev overlay)
    await page.evaluate(() => {
      const btn = document.getElementById("sidebar-toggle");
      if (btn) btn.click();
    });
    await page.waitForTimeout(400);
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");

    // Cookie should reflect collapsed
    const cookies = await context.cookies();
    const sidebarCookie = cookies.find((c) => c.name === "sidebar:state");
    expect(sidebarCookie?.value).toBe("true"); // true = isCollapsed = collapsed

    // Reload restoration — should stay collapsed
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("aside[data-state]").first()).toHaveAttribute(
      "data-state",
      "collapsed",
    );

    // Keyboard toggle (Ctrl+B) — expand again
    await page.keyboard.press("Control+b");
    await page.waitForTimeout(400);
    await expect(page.locator("aside[data-state]").first()).toHaveAttribute(
      "data-state",
      "expanded",
    );
  });

  test("mobile drawer independence", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Mobile open navigation button — aria-label "Open navigation"
    const mobileToggle = page.getByRole("button", { name: /Open navigation/i });
    await expect(mobileToggle).toBeVisible();

    // Use force click to bypass potential overlay on mobile
    await mobileToggle.click({ force: true });

    // Drawer (role=dialog) should open
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  });
});
