import { beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitExceededError } from "@/lib/providers/rate-limit/rate-limit.provider";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  project: vi.fn(),
  country: vi.fn(),
  run: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/features/projects/services/project-service", () => ({
  getProjectService: mocks.project,
}));
vi.mock("../repository/market-repository", () => ({
  getTargetCountry: mocks.country,
  getMarketAnalysisRun: vi.fn(),
}));
vi.mock("../services/market-service", () => ({
  addTargetCountryService: vi.fn(),
  removeTargetCountryService: vi.fn(),
  updateTargetCountryService: vi.fn(),
  changeCountryStatusService: vi.fn(),
}));
vi.mock("../services/market-analysis-execution-service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/market-analysis-execution-service")>();
  return { ...actual, runMarketAnalysis: mocks.run, retryMarketAnalysis: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { runMarketAnalysisFormAction } from "./market-actions";
import { MarketAnalysisServiceError } from "../services/market-analysis-execution-service";

function formData() {
  const data = new FormData();
  data.set("projectSlug", "marketra");
  data.set("countryId", "country-us");
  return data;
}

describe("runMarketAnalysisFormAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1" },
      activeWorkspace: { workspace: { id: "workspace-1" }, role: "admin" },
    });
    mocks.project.mockResolvedValue({ id: "project-1", slug: "marketra" });
    mocks.country.mockResolvedValue({
      id: "country-us",
      project_id: "project-1",
      country_code: "US",
    });
    mocks.run.mockResolvedValue({ runId: "run-1" });
  });

  it("runs the workspace-scoped service and revalidates the complete journey", async () => {
    await expect(runMarketAnalysisFormAction(null, formData())).resolves.toMatchObject({
      status: "success",
    });
    expect(mocks.run).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        projectId: "project-1",
        targetCountryId: "country-us",
      }),
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard/projects/marketra/markets/US/icp");
    expect(mocks.revalidate).toHaveBeenCalledWith(
      "/dashboard/projects/marketra/markets/US/discovery",
    );
  });

  it("rejects a country belonging to another project without calling the provider", async () => {
    mocks.country.mockResolvedValue({
      id: "country-us",
      project_id: "other-project",
      country_code: "US",
    });
    const result = await runMarketAnalysisFormAction(null, formData());
    expect(result).toMatchObject({ status: "inaccessible" });
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("maps durable rate-limit denial to a safe reference", async () => {
    mocks.run.mockRejectedValue(
      new RateLimitExceededError({
        allowed: false,
        remaining: 0,
        limit: 10,
        resetAt: Date.now() + 1_000,
        retryAfterSeconds: 1,
        operationId: "rate-operation",
      }),
    );
    const result = await runMarketAnalysisFormAction(null, formData());
    expect(result).toMatchObject({ status: "rate_limited" });
    expect(result.reference).toMatch(/^AI-PROVIDER-RATE-/);
    expect(JSON.stringify(result)).not.toContain("workspace-1");
  });

  it("preserves an allowlisted provider category without leaking provider details", async () => {
    mocks.run.mockRejectedValue(
      new MarketAnalysisServiceError(
        "ai_provider_unavailable",
        "AI analysis provider is unavailable.",
        "AI-PROVIDER-AUTH",
      ),
    );
    const result = await runMarketAnalysisFormAction(null, formData());
    expect(result.reference).toMatch(/^AI-PROVIDER-AUTH-/);
    expect(JSON.stringify(result)).not.toContain("api_key");
  });
});
