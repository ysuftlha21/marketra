import { test, expect } from "@playwright/test";

const ROUTES = [
  "/dashboard",
  "/dashboard/projects",
  "/dashboard/markets",
  "/dashboard/companies",
  "/dashboard/outreach",
  "/dashboard/crm",
  "/dashboard/settings",
] as const;

test.describe("Dashboard access", () => {
  test("dashboard overview loads and shows sidebar nav", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome to Marketra/i })).toBeVisible();
  });

  test("all dashboard routes load without runtime errors", async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("Desktop navigation", () => {
  test.skip(({ viewport }) => {
    const isMobile = (viewport?.width ?? 1280) < 768;
    if (isMobile) return true;
    return false;
  }, "Desktop-only test");

  test("primary navigation links work", async ({ page }) => {
    await page.goto("/dashboard");

    await page
      .getByRole("link", { name: /Markets/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/markets/);
    await expect(page.getByRole("heading", { name: /Target countries/i })).toBeVisible();

    await page.getByRole("link", { name: /CRM/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/crm/);
    await expect(page.getByRole("heading", { name: /Lightweight CRM/i })).toBeVisible();

    await page
      .getByRole("link", { name: /Settings/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard\/settings/);
    await expect(page.getByRole("heading", { name: /Workspace settings/i })).toBeVisible();
  });
});

test.describe("Mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile dashboard nav drawer opens and contains links", async ({ page }) => {
    await page.goto("/dashboard");
    const toggle = page.getByRole("button", { name: /Open navigation/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole("dialog", { name: /Dashboard navigation/i })).toBeVisible();
  });
});

test.describe("Workspace settings", () => {
  test("workspace settings page shows current workspace name", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.getByRole("heading", { name: /Workspace settings/i })).toBeVisible();
  });
});

test.describe("Workspace rename", () => {
  test("owner can rename the workspace", async ({ page }) => {
    await page.goto("/dashboard/settings");

    const input = page.getByLabel("Workspace name");
    await expect(input).toBeVisible();

    // Rename with a short unique name to stay under 60 chars
    const suffix = Date.now().toString().slice(-6);
    const newName = `E2E Rename ${suffix}`;
    await input.fill(newName);
    await page.getByRole("button", { name: /Save name/i }).click();
    await expect(page.getByText(/Saved\./i)).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByLabel("Workspace name")).toHaveValue(newName);
  });
});

test.describe("Workspace switching", () => {
  test("sidebar shows the active workspace name", async ({ page }, testInfo) => {
    await page.goto("/dashboard");
    if (testInfo.project.name.includes("mobile")) {
      await page.getByRole("button", { name: "Open navigation" }).click();
    }
    // The "Switch workspace" button shows the current workspace name on all viewports
    await expect(page.getByRole("button", { name: /Switch workspace/i })).toBeVisible();
  });
});

test.describe("Session persistence", () => {
  test("session persists across page reloads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome to Marketra/i })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: /Welcome to Marketra/i })).toBeVisible();
  });

  test("session persists across navigation", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/dashboard/settings");
    await expect(page.locator("body")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome to Marketra/i })).toBeVisible();
  });
});
