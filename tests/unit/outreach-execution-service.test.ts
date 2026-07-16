import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OutreachProvider } from "@/lib/providers/outreach/outreach.provider";

const mocks = vi.hoisted(() => ({
  consumeUsage: vi.fn(),
  createRun: vi.fn(),
  updateRun: vi.fn(),
  getRun: vi.fn(),
  createDraft: vi.fn(),
  createVersion: vi.fn(),
  providerGenerate: vi.fn(),
}));

vi.mock("@/lib/env/env", () => ({
  parseServerEnv: () => ({ DEFAULT_OUTREACH_PROVIDER: "mock" }),
}));
vi.mock("@/features/workspaces/services/workspace-plan-service", () => ({
  resolveWorkspacePlan: async () => ({
    plan: { id: "free", outreachGenerationsPerPeriod: 10 },
    source: "product_default",
    usedFallback: true,
  }),
}));
vi.mock("@/features/workspaces/services/workspace-usage-service", () => ({
  consumeOutreachGeneration: mocks.consumeUsage,
}));
vi.mock("@/features/projects/services/project-service", () => ({
  getProjectService: async () => ({
    id: "project-id",
    name: "Project",
    product_description: "Product description",
  }),
}));
vi.mock("@/features/markets/repository/market-repository", () => ({
  getTargetCountry: async () => ({
    id: "country-id",
    project_id: "project-id",
    country_code: "US",
    country_name: "United States",
  }),
  getLatestMarketAnalysisRun: async () => null,
}));
vi.mock("@/features/icp/repository/icp-repository", () => ({
  getLatestIcpProfile: async () => ({
    id: "icp-id",
    status: "approved",
    industry_segments: {},
    company_attributes: {},
    buyer_roles: [],
    pains: [],
    desired_outcomes: [],
  }),
}));
vi.mock("@/features/projects/repository/project-repository", () => ({
  getLatestAnalysisRun: async () => ({
    id: "analysis-id",
    status: "succeeded",
    output: {},
  }),
}));
vi.mock("@/features/projects/domain/product-intelligence", () => ({
  toProductIntelligenceContext: () => ({ capabilities: [], customerCategories: [] }),
}));
vi.mock("@/features/companies/repository/decision-role-repository", () => ({
  getCompanyDecisionRoles: async () => [
    {
      id: "role-id",
      project_id: "project-id",
      status: "approved",
      source_run_id: "role-run-id",
      role_key: "cto",
      role_title: "CTO",
      role_family: "Engineering",
      department: "Technology",
      buying_role: "decision_maker",
      priority: "primary",
      fit_score: 90,
      likely_pain_points: [],
      likely_objections: [],
      recommended_message_angles: [],
      reasoning: "Primary role",
    },
  ],
}));
vi.mock("@/features/companies/repository/company-repository", () => ({
  getProjectCompanyOutreachContext: async () => ({
    projectCompanyId: "project-company-id",
    discoveryRunId: "discovery-run-id",
    companyName: "Actual Company",
    industry: "",
    employeeCountMin: null,
    employeeCountMax: null,
    countryCode: "US",
    headquartersCity: null,
    fitScore: 82,
    qualificationReasons: [],
    disqualificationReasons: [],
    purchaseSignals: [],
    discoveryEvidence: [],
  }),
}));
vi.mock("@/lib/providers/outreach/outreach.factory", () => ({
  createOutreachProvider: (): OutreachProvider => ({
    id: "mock",
    version: "1.0.0",
    generateOutreachDraft: mocks.providerGenerate,
  }),
}));
vi.mock("@/features/outreach/repository/outreach-repository", () => ({
  findActiveOutreachRun: async () => null,
  createOutreachRun: mocks.createRun,
  updateOutreachRun: mocks.updateRun,
  getOutreachRun: mocks.getRun,
  createOutreachDraft: mocks.createDraft,
  createOutreachDraftVersion: mocks.createVersion,
}));

import { startOutreachGeneration } from "@/features/outreach/services/outreach-execution-service";

const request = {
  channel: "email",
  messageType: "initial_contact",
  language: "en",
  objective: "Introduce the product",
  tone: "professional",
  length: "medium",
} as const;

describe("Outreach execution reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createRun.mockResolvedValue({ id: "run-id" });
    mocks.updateRun.mockResolvedValue({ id: "run-id" });
    mocks.consumeUsage.mockResolvedValue(undefined);
  });

  it("does not consume usage when the accepted run cannot be persisted", async () => {
    mocks.createRun.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      startOutreachGeneration(
        "workspace-id",
        "project-slug",
        "country-id",
        "company-id",
        "role-id",
        "user-id",
        request,
      ),
    ).rejects.toThrow("database unavailable");

    expect(mocks.consumeUsage).not.toHaveBeenCalled();
    expect(mocks.providerGenerate).not.toHaveBeenCalled();
  });

  it("persists a controlled failure synchronously without leaking diagnostics", async () => {
    const rawDiagnostic =
      "SELECT * FROM secrets; token=sk-live-secret\nError: provider response text\n at worker.ts:42";
    mocks.providerGenerate.mockRejectedValueOnce(new Error(rawDiagnostic));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      startOutreachGeneration(
        "workspace-id",
        "project-slug",
        "country-id",
        "company-id",
        "role-id",
        "user-id",
        request,
      ),
    ).resolves.toEqual({ runId: "run-id" });

    expect(mocks.createRun.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.consumeUsage.mock.invocationCallOrder[0]!,
    );
    expect(mocks.providerGenerate).toHaveBeenCalledOnce();
    expect(mocks.createDraft).not.toHaveBeenCalled();
    expect(mocks.createVersion).not.toHaveBeenCalled();

    const failedUpdate = mocks.updateRun.mock.calls.find(
      ([, , payload]) => payload.status === "failed",
    );
    expect(failedUpdate?.[2]).toMatchObject({
      error_code: "persistence_failure",
      safe_error_message: "The outreach draft could not be saved.",
    });
    expect(JSON.stringify(failedUpdate)).not.toContain(rawDiagnostic);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(rawDiagnostic);
    expect(consoleError).toHaveBeenCalledWith("Outreach generation failed", {
      runId: "run-id",
      errorCode: "persistence_failure",
      errorName: "Error",
    });

    consoleError.mockRestore();
  });
});
