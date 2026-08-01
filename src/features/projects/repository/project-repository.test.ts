import { describe, it, expect, vi, beforeEach } from "vitest";

const wsId = "8a3b2c1d-0000-4000-a000-000000000001";
const userId = "ac5d4e3f-0000-4000-a000-000000000003";
const projectId = "9b4c3d2e-0000-4000-a000-000000000002";

const mockServerClient = vi.fn();

vi.mock("@/lib/db/supabase-server", () => ({
  createServerClient: () => mockServerClient(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function makeSingle(data: unknown) {
  return vi.fn(() => ({ data, error: null }));
}

describe("project-repository — project CRUD", () => {
  it("createProject inserts with workspace_id and returns a row", async () => {
    const expectedRow = {
      id: projectId,
      workspace_id: wsId,
      name: "Test",
      slug: "test",
      product_description: "desc",
      website_url: null,
      status: "draft",
      current_markets: [],
      preferred_language: "en",
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      target_customer_summary: null,
      business_model: null,
      pricing_summary: null,
      archived_at: null,
    };

    mockServerClient.mockResolvedValue({
      from: () => ({
        insert: () => ({
          select: () => ({ single: makeSingle(expectedRow) }),
        }),
      }),
    });

    const { createProject } = await import("./project-repository");
    const result = await createProject(wsId, userId, {
      name: "Test",
      slug: "test",
      productDescription: "desc",
      currentMarkets: [],
      preferredLanguage: "en",
    });

    expect(result.id).toBe(projectId);
    expect(result.workspace_id).toBe(wsId);
  });

  it("getProjectBySlug filters by workspace_id and slug", async () => {
    mockServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              neq: () => ({
                maybeSingle: makeSingle(null),
              }),
            }),
          }),
        }),
      }),
    });

    const { getProjectBySlug } = await import("./project-repository");
    const result = await getProjectBySlug(wsId, "non-existent");
    expect(result).toBeNull();
  });

  it("getProjectBySlug includes archived when includeArchived=true", async () => {
    const archivedRow = {
      id: projectId,
      workspace_id: wsId,
      slug: "archived-proj",
      status: "archived",
    };

    mockServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: makeSingle(archivedRow),
            }),
          }),
        }),
      }),
    });

    const { getProjectBySlug } = await import("./project-repository");
    const result = await getProjectBySlug(wsId, "archived-proj", true);
    expect(result).not.toBeNull();
    expect(result?.status).toBe("archived");
  });

  it("listWorkspaceProjects returns filtered rows", async () => {
    const rows = [
      {
        id: projectId,
        name: "P1",
        slug: "p1",
        website_url: null,
        status: "active",
        updated_at: "2025",
        created_at: "2025",
      },
    ];
    mockServerClient.mockResolvedValue({
      from: () => {
        const builder: Record<string, unknown> = {
          data: rows,
          error: null,
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          order: vi.fn(() => builder),
          neq: vi.fn(() => builder),
        };
        return builder;
      },
    });

    const { listWorkspaceProjects } = await import("./project-repository");
    const result = await listWorkspaceProjects(wsId);
    expect(result).toHaveLength(1);
  });

  it("updateProject scopes by workspace_id", async () => {
    const updated = {
      id: projectId,
      workspace_id: wsId,
      name: "Updated",
      slug: "test",
      status: "active",
    };
    mockServerClient.mockResolvedValue({
      from: () => ({
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({ single: makeSingle(updated) }),
            }),
          }),
        }),
      }),
    });

    const { updateProject } = await import("./project-repository");
    const result = await updateProject(wsId, projectId, { name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("deleteProject scopes by workspace_id", async () => {
    mockServerClient.mockResolvedValue({
      from: () => ({
        delete: () => ({
          eq: () => ({
            eq: () => ({ error: null }),
          }),
        }),
      }),
    });

    const { deleteProject } = await import("./project-repository");
    await expect(deleteProject(wsId, projectId)).resolves.toBeUndefined();
  });

  it("getExistingSlugs returns lowercase slugs", async () => {
    mockServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({ data: [{ slug: "TEST" }, { slug: "Foo-Bar" }], error: null }),
        }),
      }),
    });

    const { getExistingSlugs } = await import("./project-repository");
    const slugs = await getExistingSlugs(wsId);
    expect(slugs).toEqual(["test", "foo-bar"]);
  });
});

describe("project-repository — analysis runs", () => {
  const runId = "run-0001-aaaa-bbbb-cccc00000001";

  it("createAnalysisRun inserts with workspace scope", async () => {
    const expectedRun = { id: runId, workspace_id: wsId, project_id: projectId, status: "pending" };
    mockServerClient.mockResolvedValue({
      from: () => ({
        insert: () => ({
          select: () => ({ single: makeSingle(expectedRun) }),
        }),
      }),
    });

    const { createAnalysisRun } = await import("./project-repository");
    const result = await createAnalysisRun(wsId, projectId, userId, {
      provider: "mock",
      model: "gpt-4o-mini",
      promptVersion: "v1",
      schemaVersion: "v1",
      inputSnapshot: {},
    });
    expect(result.status).toBe("pending");
    expect(result.workspace_id).toBe(wsId);
  });

  it("updateAnalysisRun filters by workspace_id and run id", async () => {
    let receivedWsId = "";
    mockServerClient.mockResolvedValue({
      from: () => ({
        update: () => ({
          eq: vi.fn((_col: string, v: string) => {
            receivedWsId = v;
            return { eq: () => ({ error: null }) };
          }),
        }),
      }),
    });

    const { updateAnalysisRun } = await import("./project-repository");
    await updateAnalysisRun(wsId, runId, { status: "succeeded" });
    expect(receivedWsId).toBe(wsId);
  });

  it("getAnalysisRun filters by workspace_id and run id", async () => {
    mockServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: makeSingle(null) }),
          }),
        }),
      }),
    });

    const { getAnalysisRun } = await import("./project-repository");
    const result = await getAnalysisRun(wsId, runId);
    expect(result).toBeNull();
  });

  it("getLatestAnalysisRun returns most recent by project_id", async () => {
    const run = { id: runId, status: "succeeded" };
    mockServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({ maybeSingle: makeSingle(run) }),
            }),
          }),
        }),
      }),
    });

    const { getLatestAnalysisRun } = await import("./project-repository");
    const result = await getLatestAnalysisRun(projectId);
    expect(result?.status).toBe("succeeded");
  });

  it("getLatestSuccessfulAnalysisRun preserves the prior valid output after a newer failure", async () => {
    const successfulRun = { id: runId, status: "succeeded", output: { schemaVersion: "v2" } };
    const statusEq = vi.fn(() => ({
      order: () => ({ limit: () => ({ maybeSingle: makeSingle(successfulRun) }) }),
    }));
    mockServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({ eq: statusEq }),
        }),
      }),
    });

    const { getLatestSuccessfulAnalysisRun } = await import("./project-repository");
    const result = await getLatestSuccessfulAnalysisRun(projectId);
    expect(statusEq).toHaveBeenCalledWith("status", "succeeded");
    expect(result?.output).toEqual({ schemaVersion: "v2" });
  });

  it("listAnalysisRuns filters by workspace_id and project_id", async () => {
    mockServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    });

    const { listAnalysisRuns } = await import("./project-repository");
    const result = await listAnalysisRuns(wsId, projectId);
    expect(result).toEqual([]);
  });

  it("hasActiveAnalysisRun returns true when pending/running runs exist", async () => {
    mockServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            in: () => ({ data: [{ id: runId }], error: null }),
          }),
        }),
      }),
    });

    const { hasActiveAnalysisRun } = await import("./project-repository");
    const result = await hasActiveAnalysisRun(projectId);
    expect(result).toBe(true);
  });

  it("hasActiveAnalysisRun returns false when no active runs", async () => {
    mockServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            in: () => ({ data: [], error: null }),
          }),
        }),
      }),
    });

    const { hasActiveAnalysisRun } = await import("./project-repository");
    const result = await hasActiveAnalysisRun(projectId);
    expect(result).toBe(false);
  });
});
