import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordProviderUsage } from "./ai-usage-service";
import { recordAiUsage } from "../repository/ai-usage-repository";

vi.mock("../repository/ai-usage-repository", () => ({ recordAiUsage: vi.fn() }));

describe("recordProviderUsage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records every bounded provider call when structured-output repair occurs", async () => {
    await recordProviderUsage({
      workspaceId: "workspace-id",
      projectId: "project-id",
      operationType: "product_analysis",
      generationRunId: "run-id",
      meta: {
        providerName: "openai",
        isMock: false,
        durationMs: 25,
        modelId: "gpt-4o-mini",
        attempts: [
          {
            durationMs: 10,
            inputTokens: 20,
            outputTokens: 10,
            tokens: 30,
            success: false,
            controlledErrorCode: "missing_required_field",
          },
          {
            durationMs: 15,
            inputTokens: 12,
            outputTokens: 8,
            tokens: 20,
            success: true,
          },
        ],
      },
    });

    expect(recordAiUsage).toHaveBeenCalledTimes(2);
    expect(recordAiUsage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        operationType: "product_analysis_call_1",
        success: false,
        controlledErrorCode: "missing_required_field",
        inputTokens: 20,
        outputTokens: 10,
      }),
    );
    expect(recordAiUsage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ operationType: "product_analysis_call_2", success: true }),
    );
  });
});
