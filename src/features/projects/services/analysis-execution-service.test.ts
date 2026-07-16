import { describe, it, expect, vi, beforeEach } from "vitest";

const wsId = "8a3b2c1d-0000-4000-a000-000000000001";
const projectId = "9b4c3d2e-0000-4000-a000-000000000002";
const userId = "ac5d4e3f-0000-4000-a000-000000000003";
const projectSlug = "my-saas";

const mockInput = {
  productName: "Test SaaS",
  productDescription: "A test product for unit testing.",
  preferredLanguage: "en" as const,
  currentMarkets: [] as string[],
};

const mockV1ResultData = {
  isMock: true,
  productSummary: "Mock summary",
  coreProblem: "Mock problem",
  valueProposition: "Mock value prop",
  capabilities: ["cap1", "cap2"],
  customerCategories: ["B2B"],
  buyerRoles: ["CTO"],
  userRoles: ["developer"],
  businessModelInterpretation: "SaaS subscription",
  pricingPositionInterpretation: "Mid-market",
  purchaseTriggers: ["trigger1"],
  adoptionBarriers: ["barrier1"],
  maturityObservations: "Early stage",
  differentiators: ["diff1"],
  unsupportedClaims: ["claim1"],
  missingInformation: ["info1"],
  clarificationQuestions: ["question1"],
  positioningStatement: "Mock positioning",
  elevatorPitch: "Mock pitch",
  confidence: "medium" as const,
};

const mockV2ResultData = {
  schemaVersion: "v2" as const,
  isMock: true,
  productCategory: "B2B SaaS Software",
  targetCustomerSegments: ["Startups"],
  userPersonas: ["Marketing"],
  buyerRoles: ["Founder"],
  primaryPainPoints: ["Pain"],
  jobsToBeDone: ["Job"],
  keyCapabilities: ["Cap"],
  customerBenefits: ["Benefit"],
  valueProposition: "VP",
  positioning: "Positioning",
  differentiators: ["Diff"],
  competitorCategories: ["Comp"],
  alternativesCustomersCurrentlyUse: ["Alt"],
  businessModel: "SaaS",
  pricingInterpretation: "Mid",
  purchaseTriggers: ["Trigger"],
  likelyObjections: ["Objection"],
  adoptionBarriers: ["Barrier"],
  useCases: ["Use case"],
  strengths: ["Strength"],
  weaknesses: ["Weakness"],
  risks: ["Risk"],
  assumptions: ["Assumption"],
  evidenceExtractedFromWebsite: ["Evidence"],
  sectionConfidences: {
    productCategory: "high" as const,
    targetCustomerSegments: "high" as const,
    valueProposition: "medium" as const,
  },
  missingInformation: ["Info"],
  clarificationQuestions: [
    {
      key: "test_q",
      question: "Question",
      category: "Test",
      isRequired: true,
    },
  ],
  confidence: "medium" as const,
};

const mockProvider = {
  name: "mock",
  isMock: true,
  analyzeProduct: vi.fn(),
  analyzeProductV1: vi.fn().mockResolvedValue({
    data: mockV1ResultData,
    meta: {
      providerName: "mock",
      isMock: true,
      durationMs: 50,
      tokens: 1500,
      estimatedCostUsd: 0.003,
    },
  }),
  analyzeProductV2: vi.fn().mockResolvedValue({
    data: mockV2ResultData,
    meta: {
      providerName: "mock",
      isMock: true,
      durationMs: 50,
      tokens: 1500,
      estimatedCostUsd: 0.003,
    },
  }),
  generateIcp: vi.fn(),
  evaluateCompany: vi.fn(),
  generateOutreach: vi.fn(),
};

const mockHasActiveRun = vi.fn().mockResolvedValue(false);
const mockGetProjectBySlug = vi.fn();
const mockCreateAnalysisRun = vi.fn().mockResolvedValue({ id: "run-001", workspace_id: wsId });
const mockUpdateAnalysisRun = vi.fn().mockResolvedValue(undefined);
const mockGetAnalysisRun = vi.fn();

vi.mock("@/lib/providers/ai/ai.factory", () => ({
  createAiProvider: () => mockProvider,
}));

vi.mock("@/lib/env/env", () => ({
  parseServerEnv: () => ({
    DEFAULT_AI_PROVIDER: "mock",
    OPENAI_MODEL: "gpt-4o-mini",
    OPENAI_PROMPT_VERSION: "v1",
    OPENAI_PROMPT_VERSION_V2: "product-analysis-v2",
    PRODUCT_ANALYSIS_VERSION: "v2",
  }),
}));

vi.mock("../repository/project-repository", () => ({
  createAnalysisRun: (...args: unknown[]) => mockCreateAnalysisRun(...args),
  updateAnalysisRun: (...args: unknown[]) => mockUpdateAnalysisRun(...args),
  getAnalysisRun: (...args: unknown[]) => mockGetAnalysisRun(...args),
  getProjectBySlug: (...args: unknown[]) => mockGetProjectBySlug(...args),
  hasActiveAnalysisRun: (...args: unknown[]) => mockHasActiveRun(...args),
}));

const defaultProject = {
  id: projectId,
  workspace_id: wsId,
  slug: projectSlug,
  status: "active",
  name: "Test SaaS",
  product_description: "A test product for unit testing.",
  website_url: null,
  preferred_language: "en",
  current_markets: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetProjectBySlug.mockResolvedValue(defaultProject);
  mockHasActiveRun.mockResolvedValue(false);
  mockCreateAnalysisRun.mockResolvedValue({ id: "run-001", workspace_id: wsId });
  mockUpdateAnalysisRun.mockResolvedValue(undefined);
  mockProvider.analyzeProductV1.mockResolvedValue({
    data: mockV1ResultData,
    meta: {
      providerName: "mock",
      isMock: true,
      durationMs: 50,
      tokens: 1500,
      estimatedCostUsd: 0.003,
    },
  });
  mockProvider.analyzeProductV2.mockResolvedValue({
    data: mockV2ResultData,
    meta: {
      providerName: "mock",
      isMock: true,
      durationMs: 50,
      tokens: 1500,
      estimatedCostUsd: 0.003,
    },
  });
});

const ctx = { workspaceId: wsId, projectSlug, userId, projectId };

describe("runProductAnalysis", () => {
  it("uses analyzeProductV1 and returns a result", async () => {
    const { runProductAnalysis } = await import("./analysis-execution-service");
    const result = await runProductAnalysis(ctx, { ...mockInput, schemaVersion: "v1" });
    expect(result.runId).toBe("run-001");
    expect(result.result).toBeDefined();
    expect(mockProvider.analyzeProductV1).toHaveBeenCalledOnce();
    expect(mockCreateAnalysisRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ promptVersion: "v1", schemaVersion: "v1" }),
    );
  });

  it("uses v2 prompt version when schemaVersion is v2", async () => {
    const { runProductAnalysis } = await import("./analysis-execution-service");
    await runProductAnalysis(ctx, { ...mockInput, schemaVersion: "v2" });
    expect(mockCreateAnalysisRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ promptVersion: "product-analysis-v2", schemaVersion: "v2" }),
    );
  });

  it("throws project_not_found when project slug does not exist", async () => {
    mockGetProjectBySlug.mockResolvedValue(null);
    const { runProductAnalysis } = await import("./analysis-execution-service");
    await expect(runProductAnalysis(ctx, mockInput)).rejects.toMatchObject({
      code: "project_not_found",
    });
  });

  it("throws project_archived when project is archived", async () => {
    mockGetProjectBySlug.mockResolvedValue({ ...defaultProject, status: "archived" });
    const { runProductAnalysis } = await import("./analysis-execution-service");
    await expect(runProductAnalysis(ctx, mockInput)).rejects.toMatchObject({
      code: "project_archived",
    });
  });

  it("throws analysis_already_running when an active run exists", async () => {
    mockHasActiveRun.mockResolvedValue(true);
    const { runProductAnalysis } = await import("./analysis-execution-service");
    await expect(runProductAnalysis(ctx, mockInput)).rejects.toMatchObject({
      code: "active_analysis_exists",
    });
  });

  it("writes token and cost data on success", async () => {
    const { runProductAnalysis } = await import("./analysis-execution-service");
    await runProductAnalysis(ctx, mockInput);
    expect(mockUpdateAnalysisRun).toHaveBeenCalledTimes(6);
    const allCalls = mockUpdateAnalysisRun.mock.calls as [
      string,
      string,
      Record<string, unknown>,
    ][];
    const successCall = allCalls.find((call) => call[2]?.status === "succeeded");
    expect(successCall).toBeDefined();
    if (!successCall) throw new Error("Expected success call not found");
    expect(successCall[0]).toBe(wsId);
    expect(successCall[1]).toBe("run-001");
    expect(successCall[2].input_tokens).toBe(1500);
    expect(successCall[2].estimated_cost).toBe(0.003);
    expect(successCall[2].status).toBe("succeeded");
  });

  it("marks run as failed on invalid provider response", async () => {
    mockProvider.analyzeProductV1.mockResolvedValue({
      data: { invalid: true },
      meta: { providerName: "mock", isMock: true, durationMs: 10 },
    });
    const { runProductAnalysis } = await import("./analysis-execution-service");
    await expect(
      runProductAnalysis(ctx, { ...mockInput, schemaVersion: "v1" }),
    ).rejects.toMatchObject({
      code: "provider_output_invalid",
    });

    const allCalls = mockUpdateAnalysisRun.mock.calls as [
      string,
      string,
      Record<string, unknown>,
    ][];
    const failCall = allCalls.find((call) => call[2]?.status === "failed");
    expect(failCall).toBeDefined();
  });

  it("passes workspace_id to updateAnalysisRun calls", async () => {
    const { runProductAnalysis } = await import("./analysis-execution-service");
    await runProductAnalysis(ctx, mockInput);
    for (const call of mockUpdateAnalysisRun.mock.calls as [string, ...unknown[]][]) {
      expect(call[0]).toBe(wsId);
    }
  });
});

describe("retryFailedAnalysis", () => {
  it("throws project_not_found when previous run does not exist", async () => {
    mockGetAnalysisRun.mockResolvedValue(null);
    const { retryFailedAnalysis } = await import("./analysis-execution-service");
    await expect(retryFailedAnalysis(ctx, "non-existent-run-id")).rejects.toMatchObject({
      code: "project_not_found",
    });
  });

  it("passes workspace_id to getAnalysisRun", async () => {
    mockGetAnalysisRun.mockResolvedValue({
      id: "prev-run",
      workspace_id: wsId,
      project_id: projectId,
      input_snapshot: mockInput,
      status: "failed",
    });
    mockGetProjectBySlug.mockResolvedValue(defaultProject);
    const { retryFailedAnalysis } = await import("./analysis-execution-service");
    await retryFailedAnalysis(ctx, "prev-run");
    expect(mockGetAnalysisRun).toHaveBeenCalledWith(wsId, "prev-run");
  });

  it("preserves original prompt_version and schema_version on retry", async () => {
    mockGetAnalysisRun.mockResolvedValue({
      id: "prev-run",
      workspace_id: wsId,
      project_id: projectId,
      schema_version: "v1",
      prompt_version: "custom-v1-prompt",
      input_snapshot: mockInput,
      status: "failed",
    });
    mockGetProjectBySlug.mockResolvedValue(defaultProject);
    const { retryFailedAnalysis } = await import("./analysis-execution-service");
    await retryFailedAnalysis(ctx, "prev-run");

    expect(mockCreateAnalysisRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ promptVersion: "custom-v1-prompt", schemaVersion: "v1" }),
    );
  });
});

describe("safeAnalysisError", () => {
  it("covers all error codes", async () => {
    const { safeAnalysisError } = await import("./analysis-execution-service");
    const codes = [
      "unauthenticated",
      "unauthorized",
      "project_not_found",
      "project_archived",
      "analysis_already_running",
      "provider_unavailable",
      "provider_timeout",
      "invalid_provider_response",
      "rate_limited",
      "configuration_missing",
      "analysis_persistence_failed",
      "invalid_input",
    ] as const;
    for (const code of codes) {
      expect(safeAnalysisError(code)).toBeTruthy();
    }
  });
});
