import { describe, it, expect } from "vitest";
import { createAnalyticsProvider } from "./analytics.factory";
import { MockAnalyticsProvider } from "./mock-analytics.provider";

describe("createAnalyticsProvider", () => {
  it("creates a MockAnalyticsProvider for 'mock'", () => {
    const p = createAnalyticsProvider("mock");
    expect(p).toBeInstanceOf(MockAnalyticsProvider);
    expect(p.isMock).toBe(true);
  });

  it("throws for 'external' (not implemented in Phase 1)", () => {
    expect(() => createAnalyticsProvider("external")).toThrow(
      /External AnalyticsProvider is not implemented/,
    );
  });
});
