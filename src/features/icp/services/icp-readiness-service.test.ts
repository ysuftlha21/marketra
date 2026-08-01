import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IcpProfileRow } from "../repository/icp-repository";
import { getProjectIcpReadiness, getIncompleteIcpSections } from "./icp-readiness-service";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  project: vi.fn(),
  country: vi.fn(),
  approved: vi.fn(),
  latest: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getAuthContext: mocks.auth }));
vi.mock("@/features/projects/repository/project-repository", () => ({
  getProjectBySlug: mocks.project,
}));
vi.mock("@/features/markets/repository/market-repository", () => ({
  getTargetCountryByCode: mocks.country,
}));
vi.mock("../repository/icp-repository", () => ({
  getLatestApprovedIcpProfile: mocks.approved,
  getLatestIcpProfile: mocks.latest,
}));

const profile = {
  id: "icp-1",
  name: "US SaaS ICP",
  summary: "Mid-market SaaS",
  status: "approved",
  version: 2,
  industry_segments: { primary: ["SaaS"] },
  company_attributes: { employeeRange: "11-200" },
} as unknown as IcpProfileRow;

describe("project ICP readiness", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ activeWorkspace: { workspace: { id: "ws-1" } } });
    mocks.project.mockResolvedValue({ id: "project-1" });
    mocks.country.mockResolvedValue({ id: "country-1" });
    mocks.approved.mockResolvedValue(null);
    mocks.latest.mockResolvedValue(null);
  });

  it("recognizes an approved ICP and never trusts a client workspace id", async () => {
    mocks.approved.mockResolvedValue(profile);
    await expect(getProjectIcpReadiness("marketra", "US")).resolves.toMatchObject({
      state: "ready",
      profile: { id: "icp-1", version: 2 },
    });
    expect(mocks.project).toHaveBeenCalledWith("ws-1", "marketra");
    expect(mocks.country).toHaveBeenCalledWith("ws-1", "project-1", "US");
  });

  it("uses the approved legacy version when a newer draft also exists", async () => {
    mocks.approved.mockResolvedValue(profile);
    mocks.latest.mockResolvedValue({ ...profile, id: "draft-3", version: 3, status: "draft" });
    const result = await getProjectIcpReadiness("marketra", "US");
    expect(result.state).toBe("ready");
    if (result.state === "ready") expect(result.profile.id).toBe("icp-1");
    expect(mocks.latest).not.toHaveBeenCalled();
  });

  it("distinguishes missing, incomplete and inaccessible states", async () => {
    await expect(getProjectIcpReadiness("marketra", "US")).resolves.toMatchObject({
      state: "missing",
    });
    mocks.latest.mockResolvedValue({ ...profile, status: "draft" });
    await expect(getProjectIcpReadiness("marketra", "US")).resolves.toMatchObject({
      state: "incomplete",
      incompleteSections: ["Approval"],
    });
    mocks.approved.mockRejectedValue(new Error("RLS denied"));
    await expect(getProjectIcpReadiness("marketra", "US")).resolves.toEqual({
      state: "inaccessible",
    });
  });

  it("reports exact incomplete sections", () => {
    expect(
      getIncompleteIcpSections({
        ...profile,
        name: "",
        summary: "",
        status: "draft",
        industry_segments: {},
        company_attributes: {},
      }),
    ).toEqual(["Profile summary", "Industries", "Company attributes", "Approval"]);
  });

  it("does not recognize a project or ICP from another workspace", async () => {
    mocks.project.mockResolvedValue(null);
    await expect(getProjectIcpReadiness("foreign", "US")).resolves.toEqual({
      state: "inaccessible",
    });
    expect(mocks.approved).not.toHaveBeenCalled();
  });
});
