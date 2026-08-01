import { describe, expect, it } from "vitest";
import { MockAiProvider } from "./mock-ai.provider";
import { v2ProductAnalysisResultSchema } from "./ai.provider";

async function validProductAnalysis() {
  const provider = new MockAiProvider();
  return (
    await provider.analyzeProductV2({
      schemaVersion: "v2",
      productName: "Sanitized Fixture",
      productDescription: "A privacy-safe fixture used only for schema verification.",
      currentMarkets: [],
      preferredLanguage: "en",
    })
  ).data;
}

describe("canonical V2 product-analysis schema", () => {
  it("matches the normalized mock fixture and rejects drift", async () => {
    const valid = await validProductAnalysis();
    expect(v2ProductAnalysisResultSchema.safeParse(valid).success).toBe(true);
    expect(
      v2ProductAnalysisResultSchema.safeParse({ ...valid, positioning: undefined }).success,
    ).toBe(false);
    expect(
      v2ProductAnalysisResultSchema.safeParse({ ...valid, primaryPainPoints: "wrong" }).success,
    ).toBe(false);
    expect(
      v2ProductAnalysisResultSchema.safeParse({ ...valid, confidence: "certain" }).success,
    ).toBe(false);
    expect(v2ProductAnalysisResultSchema.safeParse({ ...valid, schemaVersion: "v1" }).success).toBe(
      false,
    );
  });

  it("keeps the representative concise payload within the task budget", async () => {
    const valid = await validProductAnalysis();
    const conservativeEstimatedTokens = Math.ceil(JSON.stringify(valid).length / 4);
    expect(conservativeEstimatedTokens).toBeGreaterThan(800);
    expect(conservativeEstimatedTokens).toBeLessThanOrEqual(1_200);
  });
});
