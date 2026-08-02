import { expect, test } from "@playwright/test";
import { createServiceRoleClient } from "@/lib/db/supabase-service";

const ALLOWED_TEST_PROJECT = "jwgnifnnmhudamthzjzj";
let projectSlug = "";
let projectId = "";
let targetCountryId = "";

test.describe("country ICP adaptation to company discovery", () => {
  test.beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (process.env.E2E_TEST_MODE !== "true" || !url.includes(ALLOWED_TEST_PROJECT)) {
      throw new Error("Country ICP E2E fixtures are restricted to the approved test project.");
    }
    const admin = createServiceRoleClient();
    const { data: workspace } = await admin
      .from("workspaces")
      .select("id,created_by")
      .eq("name", "E2E Outreach Desktop")
      .limit(1)
      .single();
    if (!workspace) throw new Error("Desktop E2E owner workspace is unavailable.");
    const workspaceId = workspace.id;
    const userId = workspace.created_by;
    await admin
      .from("user_preferences")
      .update({ active_workspace_id: workspaceId })
      .eq("user_id", userId);

    projectSlug = `icp-adaptation-${Date.now()}`;
    const { data: project, error: projectError } = await admin
      .from("projects")
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        name: "ICP Adaptation E2E",
        slug: projectSlug,
        status: "active",
        product_description: "A B2B SaaS platform for automated market research.",
      })
      .select("id")
      .single();
    if (projectError || !project) throw projectError ?? new Error("Project fixture failed.");
    projectId = project.id;

    const { data: productRun } = await admin
      .from("product_analysis_runs")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        requested_by: userId,
        provider: "mock",
        model: "mock",
        prompt_version: "v1",
        status: "succeeded",
        input_snapshot: {},
        output: {},
      })
      .select("id")
      .single();

    const { data: countries } = await admin
      .from("project_target_countries")
      .insert([
        {
          workspace_id: workspaceId,
          project_id: projectId,
          country_code: "DE",
          country_name: "Germany",
          added_by: userId,
        },
        {
          workspace_id: workspaceId,
          project_id: projectId,
          country_code: "US",
          country_name: "United States",
          added_by: userId,
        },
      ])
      .select("id,country_code");
    const de = countries?.find((country) => country.country_code === "DE");
    const us = countries?.find((country) => country.country_code === "US");
    if (!de || !us || !productRun) throw new Error("Country fixture failed.");
    targetCountryId = us.id;

    const { data: marketRuns } = await admin
      .from("market_analysis_runs")
      .insert(
        [de, us].map((country) => ({
          workspace_id: workspaceId,
          project_id: projectId,
          project_target_country_id: country.id,
          requested_by: userId,
          provider: "mock",
          status: "succeeded" as const,
          input_snapshot: {},
          output: {},
        })),
      )
      .select("id,project_target_country_id");
    const deMarket = marketRuns?.find((run) => run.project_target_country_id === de.id);
    if (!deMarket) throw new Error("Market fixture failed.");

    const { error: icpError } = await admin.from("icp_profiles").insert({
      workspace_id: workspaceId,
      project_id: projectId,
      project_target_country_id: de.id,
      market_analysis_run_id: deMarket.id,
      product_analysis_run_id: productRun.id,
      created_by: userId,
      version: 1,
      status: "approved",
      name: "Approved canonical SaaS ICP",
      summary: "Growth-stage B2B SaaS teams expanding internationally.",
      country_code: "DE",
      industry_segments: { primary: ["Software"] },
      company_attributes: { employeeRange: "50-250" },
      buyer_roles: [{ title: "VP Sales" }],
      technology_context: { summary: "HubSpot" },
      qualification_signals: ["B2B SaaS", "international expansion"],
      approved_by: userId,
      approved_at: new Date().toISOString(),
    });
    if (icpError) throw icpError;
  });

  test.afterAll(async () => {
    if (!projectId) return;
    await createServiceRoleClient().from("projects").delete().eq("id", projectId);
  });

  test("adapts an approved project ICP, discovers mock companies and persists after refresh", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(`/dashboard/projects/${projectSlug}/markets/US/icp`);
    await expect(page.getByRole("button", { name: "Adapt ICP for United States" })).toBeVisible();
    const adaptButton = page.getByRole("button", { name: "Adapt ICP for United States" });
    await adaptButton.click();
    await expect(page.getByRole("button", { name: "Creating ICP…" })).toBeDisabled();
    await expect(page.getByText(/Approved canonical SaaS ICP/)).toBeVisible({ timeout: 30_000 });
    await page.reload();
    await expect(page.getByText(/Approved canonical SaaS ICP/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Adapt ICP/ })).toHaveCount(0);

    const admin = createServiceRoleClient();
    const { count } = await admin
      .from("icp_profiles")
      .select("id", { count: "exact", head: true })
      .eq("project_target_country_id", targetCountryId);
    expect(count).toBe(1);

    await page.goto(`/dashboard/projects/${projectSlug}/markets/US/discovery`);
    await expect(page.getByRole("form", { name: "Company discovery filters" })).toBeVisible({
      timeout: 30_000,
    });
    const discoveryForm = page.getByRole("form", { name: "Company discovery filters" });
    await expect(discoveryForm.getByRole("textbox", { name: "Industry" })).toHaveValue("Software");
    await expect(discoveryForm.getByLabel("Technologies, comma separated")).toHaveValue("HubSpot");
    await expect(page.getByText("Manual company entry · fallback")).toBeVisible();

    await discoveryForm.getByLabel("Result limit").selectOption("10");
    await page.getByRole("button", { name: "Discover companies" }).click();
    await expect(page.getByText("Discovery completed.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Discovery Runs" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("form", { name: "Company discovery filters" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Discovery Runs" })).toBeVisible();
    await expect(page.getByText("Manual company entry · fallback")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("form", { name: "Company discovery filters" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
});
