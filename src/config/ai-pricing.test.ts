import { describe, expect, it } from "vitest";
import { estimateAiCostUsd, getAiModelPrice } from "./ai-pricing";

describe("AI pricing metadata", () => {
  it("calculates known model cost without inventing missing values", () => {
    expect(estimateAiCostUsd("openai", "gpt-4o-mini", 1_000_000, 1_000_000)).toBe(0.75);
  });
  it("returns null for unknown models or token counts", () => {
    expect(getAiModelPrice("openai", "unknown")).toBeNull();
    expect(estimateAiCostUsd("openai", "unknown", 1, 1)).toBeNull();
    expect(estimateAiCostUsd("openai", "gpt-4o-mini", undefined, 1)).toBeNull();
  });
});
