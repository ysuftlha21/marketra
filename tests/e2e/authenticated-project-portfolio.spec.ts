import { expect, test } from "@playwright/test";

test.describe("Projects portfolio workspace", () => {
  test("keeps the primary project action and portfolio state usable without horizontal overflow", async ({
    page,
  }) => {
    await page.goto("/dashboard/projects");

    await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "New project" })).toBeVisible();

    const search = page.getByRole("searchbox", { name: "Search projects" });
    if (await search.isVisible()) {
      await expect(page.getByLabel("Filter projects by status")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Project workspaces" })).toBeVisible();
      await expect(page.getByRole("progressbar").first()).toBeVisible();
      await expect(page.getByText("Recommended next").first()).toBeVisible();
    } else {
      await expect(
        page.getByRole("heading", { name: "Create your first market-entry workspace" }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Create project" })).toBeVisible();
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
