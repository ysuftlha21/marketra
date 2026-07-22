import { describe, it, expect, vi, beforeEach } from "vitest";

const wsId = "8a3b2c1d-0000-4000-a000-000000000001";
const userId = "ac5d4e3f-0000-4000-a000-000000000003";
const slug = "my-saas";

const mockAuthCtx = {
  user: { id: userId, email: "test@example.com" },
  activeWorkspace: {
    workspace: { id: wsId, name: "Test WS", slug: "test-ws" },
    membership: { role: "owner" },
  },
  session: { expiresAt: "2099-01-01" },
};

const mockGetAuthContext = vi.fn().mockResolvedValue(mockAuthCtx);
const mockCreateProject = vi.fn();
const mockUpdateProject = vi.fn();
const mockDeleteProject = vi.fn();
const mockGetProjectBySlug = vi.fn();
const mockGetExistingSlugs = vi.fn().mockResolvedValue([]);

vi.mock("@/lib/auth/session", () => ({
  getAuthContext: () => mockGetAuthContext(),
}));

vi.mock("@/features/workspaces/services/workspace-usage-service", () => ({
  checkProjectCreationAllowance: vi.fn(),
  consumeProjectCreation: vi.fn(),
  checkActiveProjectsAllowance: vi.fn(),
}));

vi.mock("@/features/workspaces/services/workspace-plan-service", async () => {
  const { getPlan } = await import("@/config/plans");
  return {
    resolveWorkspacePlan: vi.fn().mockResolvedValue({
      plan: getPlan("free"),
      source: "product_default",
      usedFallback: true,
    }),
  };
});

vi.mock("../repository/project-repository", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
  updateProject: (...args: unknown[]) => mockUpdateProject(...args),
  deleteProject: (...args: unknown[]) => mockDeleteProject(...args),
  getProjectBySlug: (...args: unknown[]) => mockGetProjectBySlug(...args),
  getExistingSlugs: (...args: unknown[]) => mockGetExistingSlugs(...args),
  listWorkspaceProjects: vi.fn(),
  getLatestAnalysisRun: vi.fn(),
  listAnalysisRuns: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthContext.mockResolvedValue(mockAuthCtx);
  mockGetExistingSlugs.mockResolvedValue([]);
});

describe("createProjectService", () => {
  it("throws unauthenticated when no auth context", async () => {
    mockGetAuthContext.mockResolvedValue(null);
    const { createProjectService } = await import("./project-service");
    await expect(
      createProjectService({
        name: "Test",
        productDescription: "desc",
        preferredLanguage: "en",
        currentMarkets: [],
      }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("throws slug_taken when slug exists", async () => {
    mockGetExistingSlugs.mockResolvedValue(["my-saas"]);
    const { createProjectService } = await import("./project-service");
    await expect(
      createProjectService({
        name: "Test",
        slug: "my-saas",
        productDescription: "desc",
        preferredLanguage: "en",
        currentMarkets: [],
      }),
    ).rejects.toMatchObject({ code: "slug_taken" });
  });

  it("creates a project successfully", async () => {
    mockCreateProject.mockResolvedValue({ id: "proj-1", workspace_id: wsId, slug });
    const { createProjectService } = await import("./project-service");
    const result = await createProjectService({
      name: "Test",
      productDescription: "desc",
      preferredLanguage: "en",
      currentMarkets: [],
    });
    expect(result).toBeDefined();
    expect(mockCreateProject).toHaveBeenCalledOnce();
  });
});

describe("archiveProjectService", () => {
  it("sets status to archived with timestamp", async () => {
    mockGetProjectBySlug.mockResolvedValue({
      id: "proj-1",
      workspace_id: wsId,
      slug,
      status: "active",
    });
    const { archiveProjectService } = await import("./project-service");
    await archiveProjectService(slug);
    expect(mockUpdateProject).toHaveBeenCalledOnce();
    const callArgs = mockUpdateProject.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(callArgs[2].status).toBe("archived");
    expect(callArgs[2].archived_at).toBeDefined();
  });
});

describe("deleteDraftProjectService", () => {
  it("throws forbidden for non-draft projects", async () => {
    mockGetProjectBySlug.mockResolvedValue({
      id: "proj-1",
      workspace_id: wsId,
      slug,
      status: "active",
    });
    const { deleteDraftProjectService } = await import("./project-service");
    await expect(deleteDraftProjectService(slug)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("deletes draft projects", async () => {
    mockGetProjectBySlug.mockResolvedValue({
      id: "proj-1",
      workspace_id: wsId,
      slug,
      status: "draft",
    });
    const { deleteDraftProjectService } = await import("./project-service");
    await deleteDraftProjectService(slug);
    expect(mockDeleteProject).toHaveBeenCalledWith(wsId, "proj-1");
  });
});
