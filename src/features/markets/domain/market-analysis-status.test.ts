import { describe, it, expect } from "vitest";
import {
  isTerminal,
  canRetry,
  isRunning,
  marketAnalysisRunStatusSchema,
} from "./market-analysis-status";

describe("marketAnalysisRunStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const s of ["pending", "running", "succeeded", "failed"]) {
      expect(marketAnalysisRunStatusSchema.safeParse(s).success).toBe(true);
    }
  });
  it("rejects invalid", () => {
    expect(marketAnalysisRunStatusSchema.safeParse("done").success).toBe(false);
  });
});

describe("isTerminal", () => {
  it("succeeded is terminal", () => expect(isTerminal("succeeded")).toBe(true));
  it("failed is terminal", () => expect(isTerminal("failed")).toBe(true));
  it("running is not terminal", () => expect(isTerminal("running")).toBe(false));
});

describe("canRetry", () => {
  it("null means can retry", () => expect(canRetry(null)).toBe(true));
  it("failed means can retry", () => expect(canRetry("failed")).toBe(true));
  it("succeeded cannot retry", () => expect(canRetry("succeeded")).toBe(false));
});

describe("isRunning", () => {
  it("pending is running", () => expect(isRunning("pending")).toBe(true));
  it("running is running", () => expect(isRunning("running")).toBe(true));
  it("succeeded is not", () => expect(isRunning("succeeded")).toBe(false));
});
