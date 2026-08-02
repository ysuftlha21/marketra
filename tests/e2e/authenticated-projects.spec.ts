import { expect, test, type Page } from "@playwright/test";

async function selectPrimaryWorkspace(page: Page) {
  await page.goto("/dashboard/settings");
  const switcher = page.getByRole("button", { name: "Switch workspace" });
  await expect(switcher).toBeVisible();
  if ((await switcher.textContent())?.includes("E2E Outreach")) {
    await switcher.click();
    const primaryWorkspace = page
      .getByRole("menuitemradio")
      .filter({ hasNotText: "E2E Outreach" })
      .first();
    await expect(primaryWorkspace).toBeVisible();
    await primaryWorkspace.click();
    await page.waitForURL(/\/dashboard$/);
  }
}

test.describe("Project flows (authenticated)", () => {
  let projectName = `E2E-Project-${Date.now()}`;
  let projectSlug: string | undefined;
  const projectDescription =
    "A comprehensive end-to-end test product for verifying Marketra project management features. This description is long enough to pass validation.";

  test("navigates to projects page and sees the project area", async ({ page }) => {
    await selectPrimaryWorkspace(page);
    await page.goto("/dashboard/projects");
    await expect(page.getByRole("heading", { name: /projects/i }).first()).toBeVisible();
  });

  test("creates a new project", async ({ page }) => {
    await page.goto("/dashboard/projects/new");
    await page.getByLabel("Project name").fill(projectName);
    await page.getByLabel("Product description").fill(projectDescription);
    await page.getByLabel("Current operating markets").fill("TR");
    await page.getByLabel("Target expansion markets").fill("US");
    await page.getByLabel("Priority regions").fill("North America");
    await page.getByLabel("Country data coverage").fill("TR");
    await page.getByRole("button", { name: /create project/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/projects\/(?!new$)[a-z0-9-]+$/, {
      timeout: 15000,
    });
    projectSlug = page.url().split("/").pop();
    await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();

    await page.goto(`/dashboard/projects/${projectSlug}/markets`);
    await expect(page.getByRole("link", { name: /United States \(US\)/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Turkey \(TR\)/ })).toHaveCount(0);
  });

  test("views project detail with analysis prompt", async ({ page }) => {
    expect(projectSlug).toBeTruthy();
    await page.goto(`/dashboard/projects/${projectSlug}`);
    await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();
    await expect(page.getByText(/no analysis yet/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /start analysis|run analysis/i })).toBeVisible();
  });

  test("runs an analysis with the Mock provider", async ({ page }) => {
    expect(projectSlug).toBeTruthy();
    await page.goto(`/dashboard/projects/${projectSlug}`);
    await page.getByRole("button", { name: /start analysis|run analysis/i }).click();
    await expect(page.getByText("Analysis completed successfully.")).toBeVisible({
      timeout: 15000,
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: /Latest product analysis/i })).toBeVisible();
  });

  test("edits a project", async ({ page }) => {
    expect(projectSlug).toBeTruthy();
    await page.goto(`/dashboard/projects/${projectSlug}/edit`);
    await expect(page.getByLabel("Project name")).toHaveValue(projectName);

    projectName = `${projectName} Updated`;
    await page.getByLabel("Project name").fill(projectName);
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();
  });

  test("archives and restores a project", async ({ page }) => {
    expect(projectSlug).toBeTruthy();
    await page.goto(`/dashboard/projects/${projectSlug}`);
    await page.getByRole("button", { name: /archive/i }).click();
    await expect(page.getByRole("heading", { name: /projects/i }).first()).toBeVisible();

    await page.goto(`/dashboard/projects/${projectSlug}`);
    await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();
    await page.getByRole("button", { name: /restore/i }).click();
    await expect(page.getByRole("heading", { name: /projects/i }).first()).toBeVisible();
  });

  test("deletes a draft project", async ({ page }) => {
    expect(projectSlug).toBeTruthy();
    await page.goto(`/dashboard/projects/${projectSlug}`);
    await page.getByRole("button", { name: /archive/i }).click();
    await expect(page.getByRole("heading", { name: /projects/i }).first()).toBeVisible();

    await page.goto("/dashboard/projects/new");
    await page.getByLabel("Project name").fill(`Draft to Delete ${Date.now()}`);
    await page.getByLabel("Product description").fill(projectDescription);
    await page.getByRole("button", { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/projects\/(?!new$)[a-z0-9-]+$/, {
      timeout: 15000,
    });
    await page.getByRole("button", { name: /delete draft/i }).click();
    await expect(page.getByRole("heading", { name: /projects/i }).first()).toBeVisible();
  });

  test("keeps the analyzed project archived for global fixture cleanup", async ({ page }) => {
    expect(projectSlug).toBeTruthy();
    await page.goto(`/dashboard/projects/${projectSlug}`);
    await expect(page.getByRole("button", { name: /restore/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: projectName, exact: true })).toBeVisible();
  });
});
