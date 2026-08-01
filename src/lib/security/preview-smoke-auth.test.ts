import { beforeEach, describe, expect, it } from "vitest";
import {
  acquirePreviewSmokeExecution,
  consumePreviewSmokeExecution,
  hasValidPreviewSmokeBearer,
  releasePreviewSmokeExecution,
  resetPreviewSmokeGuardsForTests,
} from "./preview-smoke-auth";

describe("Preview smoke authentication", () => {
  beforeEach(resetPreviewSmokeGuardsForTests);

  it("compares Bearer tokens safely for equal and unequal lengths", () => {
    const token = "a-high-entropy-preview-smoke-token-123456";
    expect(hasValidPreviewSmokeBearer(`Bearer ${token}`, token)).toBe(true);
    expect(hasValidPreviewSmokeBearer("Bearer short", token)).toBe(false);
    expect(hasValidPreviewSmokeBearer(null, token)).toBe(false);
    expect(hasValidPreviewSmokeBearer(`Bearer ${token}?query=bad`, token)).toBe(false);
  });

  it("limits executions independently and prevents concurrent execution", () => {
    expect(consumePreviewSmokeExecution("subject", 1).allowed).toBe(true);
    expect(consumePreviewSmokeExecution("subject", 2).allowed).toBe(true);
    expect(consumePreviewSmokeExecution("subject", 3).allowed).toBe(false);
    expect(acquirePreviewSmokeExecution("subject")).toBe(true);
    expect(acquirePreviewSmokeExecution("subject")).toBe(false);
    releasePreviewSmokeExecution("subject");
    expect(acquirePreviewSmokeExecution("subject")).toBe(true);
  });
});
