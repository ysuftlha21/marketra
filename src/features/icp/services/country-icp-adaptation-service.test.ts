import { beforeEach, describe, expect, it, vi } from "vitest";
import { adaptApprovedProjectIcpToCountry } from "./country-icp-adaptation-service";
import type { IcpProfileRow } from "../repository/icp-repository";

const mocks = vi.hoisted(() => ({
  existing: vi.fn(),
  source: vi.fn(),
  latestSource: vi.fn(),
  market: vi.fn(),
  nextVersion: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../repository/icp-repository", () => ({
  getLatestApprovedIcpProfile: mocks.existing,
  getLatestApprovedProjectIcpProfile: mocks.source,
  getLatestProjectIcpProfile: mocks.latestSource,
  getNextVersion: mocks.nextVersion,
  createIcpProfile: mocks.create,
}));
vi.mock("@/features/markets/repository/market-repository", () => ({
  getLatestSuccessfulMarketAnalysisRun: mocks.market,
}));

const source = {
  id: "icp-de",
  country_code: "DE",
  name: "Mid-market SaaS",
  summary: "Approved reusable context",
  status: "approved",
  product_analysis_run_id: "product-run",
  industry_segments: { primary: ["Software"] },
  company_attributes: { employeeRange: "50-250" },
  buyer_roles: [{ title: "VP Sales" }],
  user_roles: [],
  pains: ["Manual research"],
  desired_outcomes: ["Faster pipeline"],
  purchase_triggers: ["Expansion"],
  qualification_signals: ["B2B SaaS"],
  disqualification_signals: [],
  objections: [],
  preferred_channels: null,
  technology_context: { summary: "CRM" },
  procurement_context: null,
  localization_requirements: { summary: "Review locally" },
  assumptions: [],
  missing_information: [],
  validation_questions: [],
  confidence: "high",
  confidence_reason: "Approved",
} as unknown as IcpProfileRow;

const input = {
  workspaceId: "ws-1",
  projectId: "project-1",
  targetCountryId: "country-us",
  targetCountryCode: "US",
  userId: "user-1",
};

describe("country ICP adaptation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.existing.mockResolvedValue(null);
    mocks.source.mockResolvedValue(source);
    mocks.latestSource.mockResolvedValue(null);
    mocks.market.mockResolvedValue({ id: "market-us", status: "succeeded" });
    mocks.nextVersion.mockResolvedValue(1);
    mocks.create.mockImplementation(async (_ws: string, data: Record<string, unknown>) => ({
      ...source,
      ...data,
      id: "icp-us",
    }));
  });

  it("creates one target-owned approved profile without calling a paid provider", async () => {
    const result = await adaptApprovedProjectIcpToCountry(input);
    expect(result).toMatchObject({ created: true, profile: { country_code: "US" } });
    expect(mocks.create).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({
        project_target_country_id: "country-us",
        market_analysis_run_id: "market-us",
        status: "approved",
        current_generation_run_id: null,
        buyer_roles: source.buyer_roles,
        technology_context: source.technology_context,
      }),
    );
  });

  it("is idempotent when the target already has an approved ICP", async () => {
    mocks.existing.mockResolvedValue({ ...source, id: "existing-us", country_code: "US" });
    await expect(adaptApprovedProjectIcpToCountry(input)).resolves.toMatchObject({
      created: false,
      profile: { id: "existing-us" },
    });
    expect(mocks.source).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("never reuses a wrong-country profile as the target record", async () => {
    await adaptApprovedProjectIcpToCountry(input);
    expect(mocks.source).toHaveBeenCalledWith("ws-1", "project-1", "country-us");
    expect(mocks.create).toHaveBeenCalledWith(
      "ws-1",
      expect.objectContaining({ country_code: "US", project_target_country_id: "country-us" }),
    );
  });

  it("requires a successful target-market analysis", async () => {
    mocks.market.mockResolvedValue(null);
    await expect(adaptApprovedProjectIcpToCountry(input)).rejects.toMatchObject({
      code: "market_analysis_missing",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("distinguishes an incomplete source from a missing source", async () => {
    mocks.source.mockResolvedValue(null);
    mocks.latestSource.mockResolvedValue({ ...source, status: "draft" });
    await expect(adaptApprovedProjectIcpToCountry(input)).rejects.toMatchObject({
      code: "source_incomplete",
    });
  });
});
