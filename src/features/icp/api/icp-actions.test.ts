import { beforeEach, describe, expect, it, vi } from "vitest";
import { adaptCountryIcpAction } from "./icp-actions";
import { CountryIcpAdaptationError } from "../services/country-icp-adaptation-service";
import type { CountryIcpAdaptationErrorCode } from "../services/country-icp-adaptation-service";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  project: vi.fn(),
  country: vi.fn(),
  adapt: vi.fn(),
  revalidate: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/features/projects/services/project-service", () => ({
  getProjectService: mocks.project,
}));
vi.mock("@/features/markets/repository/market-repository", () => ({
  getTargetCountry: mocks.country,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("../services/country-icp-adaptation-service", () => {
  class AdaptationError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  }
  return {
    adaptApprovedProjectIcpToCountry: mocks.adapt,
    CountryIcpAdaptationError: AdaptationError,
  };
});
vi.mock("../services/icp-generation-service", () => ({
  generateIcp: vi.fn(),
  IcpGenError: class extends Error {},
  safeIcpError: vi.fn(),
}));
vi.mock("../services/icp-management-service", () => ({
  updateIcpDraft: vi.fn(),
  approveIcp: vi.fn(),
  rejectIcp: vi.fn(),
  restoreIcpToDraft: vi.fn(),
  archiveIcp: vi.fn(),
  IcpServiceError: class extends Error {},
}));

function form() {
  const value = new FormData();
  value.set("projectSlug", "marketra");
  value.set("countryId", "country-us");
  value.set("countryCode", "US");
  return value;
}

describe("adapt country ICP action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1" },
      activeWorkspace: { workspace: { id: "ws-1" }, role: "admin" },
    });
    mocks.project.mockResolvedValue({ id: "project-1" });
    mocks.country.mockResolvedValue({
      id: "country-us",
      project_id: "project-1",
      country_code: "US",
    });
    mocks.adapt.mockResolvedValue({ created: true, profile: { id: "icp-us" } });
  });

  it("adapts successfully and revalidates ICP, discovery, builder and layout paths", async () => {
    await expect(adaptCountryIcpAction(null, form())).resolves.toMatchObject({ status: "success" });
    expect(mocks.adapt).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        projectId: "project-1",
        targetCountryId: "country-us",
      }),
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard/projects/marketra/markets/US/icp");
    expect(mocks.revalidate).toHaveBeenCalledWith(
      "/dashboard/projects/marketra/markets/US/discovery",
    );
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("returns already_exists without creating another version", async () => {
    mocks.adapt.mockResolvedValue({ created: false, profile: { id: "existing" } });
    await expect(adaptCountryIcpAction(null, form())).resolves.toMatchObject({
      status: "already_exists",
    });
  });

  it("rejects members and cross-project countries before adaptation", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: "user-1" },
      activeWorkspace: { workspace: { id: "ws-1" }, role: "member" },
    });
    await expect(adaptCountryIcpAction(null, form())).resolves.toMatchObject({
      status: "unauthorized",
    });
    mocks.country.mockResolvedValue({
      id: "country-us",
      project_id: "foreign-project",
      country_code: "US",
    });
    await expect(adaptCountryIcpAction(null, form())).resolves.toMatchObject({
      status: "inaccessible",
    });
    expect(mocks.adapt).not.toHaveBeenCalled();
  });

  it.each([
    ["source_missing", "source_icp_missing"],
    ["source_incomplete", "source_icp_incomplete"],
    ["market_analysis_missing", "validation_failed"],
  ])("maps %s to %s", async (code, status) => {
    mocks.adapt.mockRejectedValue(
      new CountryIcpAdaptationError(code as CountryIcpAdaptationErrorCode),
    );
    await expect(adaptCountryIcpAction(null, form())).resolves.toMatchObject({ status });
  });

  it("returns a safe persistence reference without exposing the underlying error", async () => {
    mocks.adapt.mockRejectedValue(new Error("database details"));
    const result = await adaptCountryIcpAction(null, form());
    expect(result).toMatchObject({
      status: "persistence_failed",
      message: "The ICP could not be saved.",
    });
    expect(JSON.stringify(result)).not.toContain("database details");
    expect(result.operationId).toBeTruthy();
  });
});
