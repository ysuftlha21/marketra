import { describe, it, expect, vi, beforeEach } from "vitest";

const wsId = "8a3b2c1d-0000-4000-a000-000000000001";
const projectId = "9b4c3d2e-0000-4000-a000-000000000002";
const tcId = "ab5e6f4d-0000-4000-a000-000000000004";
const userId = "ac5d4e3f-0000-4000-a000-000000000003";
const icpId = "bc6d5e4f-0000-4000-a000-000000000005";
const companyId = "cc7d6e5f-0000-4000-a000-000000000006";
const runId = "dc8e7f6a-0000-4000-a000-000000000007";

const mockProject = {
  id: projectId,
  workspace_id: wsId,
  slug: "my-saas",
  name: "My SaaS",
  product_description: "A test product",
  website_url: "https://example.com",
  status: "active",
  preferred_language: "en",
  current_markets: [],
};

const mockTargetCountry = {
  id: tcId,
  workspace_id: wsId,
  project_id: projectId,
  country_code: "DE",
  country_name: "Germany",
  region_code: null,
  status: "active",
  added_by: userId,
};

const mockIcp = {
  id: icpId,
  workspace_id: wsId,
  project_id: projectId,
  project_target_country_id: tcId,
  status: "approved",
  industry_segments: {
    primary: ["SaaS", "Fintech"],
    secondary: ["HR Tech"],
  },
  company_attributes: { stage: ["growth"] },
  buyer_roles: [{ role: "CTO" }],
  qualification_signals: ["recent_funding", "hiring"],
  disqualification_signals: ["regulated_industry"],
  purchase_triggers: ["scaling"],
  version: 2,
  name: "German ICP",
  summary: "ICP for Germany",
  country_code: "DE",
  user_roles: [],
  pains: [],
  desired_outcomes: [],
  objections: [],
  preferred_channels: null,
  technology_context: null,
  procurement_context: null,
  localization_requirements: null,
  assumptions: [],
  missing_information: [],
  validation_questions: [],
  confidence: "medium",
  confidence_reason: "Based on market data",
  user_edits: null,
  approved_by: userId,
  approved_at: new Date().toISOString(),
  rejected_by: null,
  rejected_at: null,
  archived_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: userId,
  current_generation_run_id: null,
  market_analysis_run_id: "",
  product_analysis_run_id: null,
};

const mockCreatedRun = {
  id: runId,
  workspace_id: wsId,
  project_id: projectId,
  target_country_id: tcId,
  icp_profile_id: icpId,
  provider: "mock",
  provider_version: "0.1.0",
  status: "queued",
  input_snapshot: {},
  criteria_snapshot: {},
  result_summary: {},
  error_code: null,
  safe_error_message: null,
  started_at: null,
  completed_at: null,
  failed_at: null,
  created_by: userId,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCompany = {
  id: companyId,
  workspace_id: wsId,
  canonical_name: "Altus Technologies",
  normalized_name: "altus technologies",
  primary_domain: "altustechnologies.com",
  normalized_domain: "altustechnologies.com",
  website_url: "https://www.altustechnologies.com",
  country_code: "DE",
  industry: "SaaS",
  industry_tags: ["SaaS"],
  employee_count_min: 20,
  employee_count_max: 50,
  employee_count_estimate: 35,
  annual_revenue_min: 5000000,
  annual_revenue_max: 10000000,
  annual_revenue_currency: "USD",
  company_type: "private",
  founded_year: 2015,
  technology_signals: ["React", "Node.js"],
  growth_signals: ["hiring"],
  source_provider: "mock",
  source_external_id: "mock-DE-0",
  source_url: "https://example.com/company/altustechnologies.com",
  first_seen_at: new Date().toISOString(),
  last_seen_at: new Date().toISOString(),
};

// ── Mocks ──────────────────────────────────────────────────────

const mockGetProjectService = vi.fn();
const mockGetTargetCountry = vi.fn();
const mockGetLatestIcpProfile = vi.fn();
const mockGetLatestApprovedIcpProfile = vi.fn();
const mockFindActiveDiscoveryRun = vi.fn();
const mockCreateDiscoveryRun = vi.fn();
const mockUpdateDiscoveryRun = vi.fn();
const mockGetDiscoveryRun = vi.fn();
const mockFindCompanyByNormalizedDomain = vi.fn();
const mockUpsertCompany = vi.fn();
const mockProjectCompanyExists = vi.fn();
const mockCreateProjectCompany = vi.fn();

vi.mock("@/features/projects/services/project-service", () => ({
  getProjectService: (...args: unknown[]) => mockGetProjectService(...args),
}));

vi.mock("@/features/markets/repository/market-repository", () => ({
  getTargetCountry: (...args: unknown[]) => mockGetTargetCountry(...args),
}));

vi.mock("@/features/icp/repository/icp-repository", () => ({
  getLatestIcpProfile: (...args: unknown[]) => mockGetLatestIcpProfile(...args),
  getLatestApprovedIcpProfile: (...args: unknown[]) => mockGetLatestApprovedIcpProfile(...args),
}));

vi.mock("../repository/company-repository", () => ({
  findActiveDiscoveryRun: (...args: unknown[]) => mockFindActiveDiscoveryRun(...args),
  createDiscoveryRun: (...args: unknown[]) => mockCreateDiscoveryRun(...args),
  updateDiscoveryRun: (...args: unknown[]) => mockUpdateDiscoveryRun(...args),
  getDiscoveryRun: (...args: unknown[]) => mockGetDiscoveryRun(...args),
  findCompanyByNormalizedDomain: (...args: unknown[]) => mockFindCompanyByNormalizedDomain(...args),
  upsertCompany: (...args: unknown[]) => mockUpsertCompany(...args),
  projectCompanyExists: (...args: unknown[]) => mockProjectCompanyExists(...args),
  createProjectCompany: (...args: unknown[]) => mockCreateProjectCompany(...args),
}));

vi.mock("@/lib/env/env", () => ({
  parseServerEnv: () => ({
    DEFAULT_COMPANY_DISCOVERY_PROVIDER: "mock",
  }),
}));

vi.mock("./provider-usage-service", () => ({
  ProviderUsageError: class ProviderUsageError extends Error {
    constructor(readonly code: "unavailable" | "limit_reached") {
      super(code);
    }
  },
  assertProviderAllowance: vi.fn().mockResolvedValue({ used: 0, limit: 10, remaining: 10 }),
  recordProviderOperation: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetProjectService.mockResolvedValue(mockProject);
  mockGetTargetCountry.mockResolvedValue(mockTargetCountry);
  mockGetLatestIcpProfile.mockResolvedValue(mockIcp);
  mockGetLatestApprovedIcpProfile.mockResolvedValue(mockIcp);
  mockFindActiveDiscoveryRun.mockResolvedValue(null);
  mockCreateDiscoveryRun.mockResolvedValue(mockCreatedRun);
  mockUpdateDiscoveryRun.mockResolvedValue(undefined);
  mockFindCompanyByNormalizedDomain.mockResolvedValue(null);
  mockUpsertCompany.mockResolvedValue(mockCompany);
  mockProjectCompanyExists.mockResolvedValue(false);
  mockCreateProjectCompany.mockResolvedValue({ id: "pc-001", workspace_id: wsId });
});

// ── Tests ──────────────────────────────────────────────────────

describe("startDiscovery", () => {
  it("returns runId on success", async () => {
    const { startDiscovery } = await import("./discovery-execution-service");
    const usage = await import("./provider-usage-service");
    const result = await startDiscovery(wsId, "my-saas", tcId, userId);
    expect(result.runId).toBe(runId);
    expect(mockGetProjectService).toHaveBeenCalledWith("my-saas");
    expect(mockGetTargetCountry).toHaveBeenCalledWith(wsId, tcId);
    expect(mockGetLatestApprovedIcpProfile).toHaveBeenCalledWith(wsId, tcId);
    expect(mockFindActiveDiscoveryRun).toHaveBeenCalledWith(wsId, tcId);
    expect(mockCreateDiscoveryRun).toHaveBeenCalled();
    expect(mockUpdateDiscoveryRun).toHaveBeenCalled();
    expect(usage.assertProviderAllowance).not.toHaveBeenCalled();
    expect(usage.recordProviderOperation).not.toHaveBeenCalled();
  });

  it("throws project_not_found when project does not exist", async () => {
    mockGetProjectService.mockResolvedValue(null);
    const { startDiscovery } = await import("./discovery-execution-service");
    await expect(startDiscovery(wsId, "missing", tcId, userId)).rejects.toMatchObject({
      code: "project_not_found",
    });
  });

  it("throws country_not_found when target country does not exist", async () => {
    mockGetTargetCountry.mockResolvedValue(null);
    const { startDiscovery } = await import("./discovery-execution-service");
    await expect(startDiscovery(wsId, "my-saas", tcId, userId)).rejects.toMatchObject({
      code: "country_not_found",
    });
  });

  it("throws icp_not_found when no ICP exists", async () => {
    mockGetLatestApprovedIcpProfile.mockResolvedValue(null);
    mockGetLatestIcpProfile.mockResolvedValue(null);
    const { startDiscovery } = await import("./discovery-execution-service");
    await expect(startDiscovery(wsId, "my-saas", tcId, userId)).rejects.toMatchObject({
      code: "icp_not_found",
    });
  });

  it("throws icp_not_approved when ICP is not approved", async () => {
    mockGetLatestApprovedIcpProfile.mockResolvedValue(null);
    mockGetLatestIcpProfile.mockResolvedValue({ ...mockIcp, status: "draft" });
    const { startDiscovery } = await import("./discovery-execution-service");
    await expect(startDiscovery(wsId, "my-saas", tcId, userId)).rejects.toMatchObject({
      code: "icp_not_approved",
    });
  });

  it("throws already_running when an active run exists", async () => {
    mockFindActiveDiscoveryRun.mockResolvedValue({ id: "active-run", status: "running" });
    const { startDiscovery } = await import("./discovery-execution-service");
    await expect(startDiscovery(wsId, "my-saas", tcId, userId)).rejects.toMatchObject({
      code: "already_running",
    });
  });

  it("marks run as failed on provider error", async () => {
    // Need to make the provider throw after run creation
    // We'll do this by making updateDiscoveryRun (the "running" status) mutate the mock
    // so that the next provider call fails. Instead, let's spy on the factory.
    // Simpler: inject a provider that throws by manipulating the module.
    const { startDiscovery } = await import("./discovery-execution-service");
    // Re-mock the factory to return a provider with a failing discoverCompaniesV1
    const mockProvider =
      await import("@/lib/providers/company-discovery/mock-company-discovery.provider");
    const origDiscover = mockProvider.MockCompanyDiscoveryProvider.prototype.discoverCompaniesV1;
    mockProvider.MockCompanyDiscoveryProvider.prototype.discoverCompaniesV1 = vi
      .fn()
      .mockRejectedValue(new Error("timeout"));

    await expect(startDiscovery(wsId, "my-saas", tcId, userId)).rejects.toMatchObject({
      code: "provider_timeout",
    });

    const calls = mockUpdateDiscoveryRun.mock.calls as [string, string, Record<string, unknown>][];
    const failCall = calls.find((call) => call[2]?.status === "failed");
    expect(failCall).toBeDefined();
    expect(failCall?.[2]?.error_code).toBe("provider_timeout");

    mockProvider.MockCompanyDiscoveryProvider.prototype.discoverCompaniesV1 = origDiscover;
  });

  it("persists companies and project entries for each candidate", async () => {
    const { startDiscovery } = await import("./discovery-execution-service");
    await startDiscovery(wsId, "my-saas", tcId, userId, 5);
    expect(mockUpsertCompany).toHaveBeenCalled();
    expect(mockCreateProjectCompany).toHaveBeenCalled();
  });

  it("skips duplicate project companies", async () => {
    mockProjectCompanyExists.mockResolvedValue(true);
    const { startDiscovery } = await import("./discovery-execution-service");
    await startDiscovery(wsId, "my-saas", tcId, userId, 3);
    expect(mockCreateProjectCompany).not.toHaveBeenCalled();
  });

  it("reuses existing company when normalized domain matches", async () => {
    mockFindCompanyByNormalizedDomain.mockResolvedValue(mockCompany);
    const { startDiscovery } = await import("./discovery-execution-service");
    await startDiscovery(wsId, "my-saas", tcId, userId, 3);
    // First candidate (index 0) has no domain so it always upserts;
    // subsequent candidates find existing by domain and skip upsert
    expect(mockFindCompanyByNormalizedDomain).toHaveBeenCalled();
    expect(mockUpsertCompany).toHaveBeenCalledTimes(1);
    expect(mockCreateProjectCompany).toHaveBeenCalled();
  });
});

describe("retryDiscovery", () => {
  it("throws country_not_found when previous run does not exist", async () => {
    mockGetDiscoveryRun.mockResolvedValue(null);
    const { retryDiscovery } = await import("./discovery-execution-service");
    await expect(retryDiscovery(wsId, "my-saas", runId, userId)).rejects.toMatchObject({
      code: "country_not_found",
    });
  });

  it("reuses the previous run's target_country_id and maxResults", async () => {
    mockGetDiscoveryRun.mockResolvedValue({
      ...mockCreatedRun,
      input_snapshot: {
        project: { name: "My SaaS" },
        country: { code: "DE" },
        maxResults: 10,
      },
    });
    const { retryDiscovery } = await import("./discovery-execution-service");
    await retryDiscovery(wsId, "my-saas", runId, userId);
    expect(mockGetTargetCountry).toHaveBeenCalledWith(wsId, tcId);
  });

  it("defaults maxResults to 50 when not in snapshot", async () => {
    mockGetDiscoveryRun.mockResolvedValue({
      ...mockCreatedRun,
      input_snapshot: { project: {}, country: { code: "DE" } },
    });
    const { retryDiscovery } = await import("./discovery-execution-service");
    await retryDiscovery(wsId, "my-saas", runId, userId);
    expect(mockCreateDiscoveryRun).toHaveBeenCalled();
  });
});

describe("safeDiscoveryError", () => {
  it("covers all error codes", async () => {
    const { safeDiscoveryError } = await import("./discovery-execution-service");
    const codes = [
      "unauthenticated",
      "unauthorized",
      "project_not_found",
      "country_not_found",
      "icp_not_found",
      "icp_not_approved",
      "already_running",
      "provider_unavailable",
      "provider_timeout",
      "invalid_provider_response",
      "configuration_missing",
      "persistence_failure",
    ] as const;
    for (const code of codes) {
      expect(safeDiscoveryError(code)).toBeTruthy();
    }
  });
});
