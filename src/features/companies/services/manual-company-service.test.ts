import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProjectBySlug: vi.fn(),
  getTargetCountry: vi.fn(),
  enforceRateLimit: vi.fn(),
  createDiscoveryRun: vi.fn(),
  createProjectCompany: vi.fn(),
  findDomain: vi.fn(),
  findName: vi.fn(),
  projectCompanyExists: vi.fn(),
  upsertCompany: vi.fn(),
}));

vi.mock("@/features/projects/repository/project-repository", () => ({
  getProjectBySlug: mocks.getProjectBySlug,
}));
vi.mock("@/features/markets/repository/market-repository", () => ({
  getTargetCountry: mocks.getTargetCountry,
}));
vi.mock("@/lib/security/rate-limit-service", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("../repository/company-repository", () => ({
  createDiscoveryRun: mocks.createDiscoveryRun,
  createProjectCompany: mocks.createProjectCompany,
  findCompanyByNormalizedDomain: mocks.findDomain,
  findCompanyByNormalizedName: mocks.findName,
  projectCompanyExists: mocks.projectCompanyExists,
  upsertCompany: mocks.upsertCompany,
}));

import { createManualCompany } from "./manual-company-service";

const input = {
  projectSlug: "acme",
  targetCountryId: "00000000-0000-4000-8000-000000000001",
  companyName: "Acme GmbH",
  websiteUrl: "https://acme.example",
  countryCode: "DE",
  industry: "SaaS",
};
const context = {
  workspaceId: "00000000-0000-4000-8000-000000000010",
  userId: "00000000-0000-4000-8000-000000000020",
};

describe("manual company service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProjectBySlug.mockResolvedValue({ id: "project-1" });
    mocks.getTargetCountry.mockResolvedValue({
      id: input.targetCountryId,
      project_id: "project-1",
      country_code: "DE",
    });
    mocks.findDomain.mockResolvedValue(null);
    mocks.upsertCompany.mockResolvedValue({ id: "company-1" });
    mocks.createDiscoveryRun.mockResolvedValue({ id: "run-1" });
    mocks.createProjectCompany.mockResolvedValue({ id: "pc-1" });
  });

  it("creates a manual discovery run and compatible project company", async () => {
    await expect(createManualCompany(input, context)).resolves.toMatchObject({ id: "pc-1" });
    expect(mocks.createDiscoveryRun).toHaveBeenCalledWith(
      context.workspaceId,
      expect.objectContaining({ provider: "manual", status: "completed" }),
    );
    expect(mocks.createProjectCompany).toHaveBeenCalledWith(
      expect.objectContaining({ discovery_run_id: "run-1", company_id: "company-1" }),
    );
  });

  it("rejects a duplicate in the same project market", async () => {
    mocks.findDomain.mockResolvedValue({ id: "company-1" });
    mocks.projectCompanyExists.mockResolvedValue(true);
    await expect(createManualCompany(input, context)).rejects.toMatchObject({ code: "duplicate" });
    expect(mocks.createDiscoveryRun).not.toHaveBeenCalled();
  });
});
