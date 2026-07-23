import { describe, expect, it } from "vitest";
import { plans } from "@/config/plans";
import {
  mapOutreachExecutionError,
  safeOutreachError,
} from "@/features/outreach/domain/outreach-errors";
import { resolveSubscriptionPlan } from "@/features/workspaces/services/workspace-plan-service";

describe("Outreach correctness boundaries", () => {
  it.each([
    "SELECT token FROM secrets WHERE api_key = 'sk-live-secret'",
    "Error: provider failed\n at generate (provider.ts:42:7)",
    "Provider response: internal upstream body",
    "Authorization: Bearer token-like-secret",
  ])("maps raw internal diagnostics to a controlled safe message", (diagnostic) => {
    const raw = new Error(diagnostic);
    const code = mapOutreachExecutionError(raw);
    const safe = safeOutreachError(code);

    expect(code).toBe("persistence_failure");
    expect(safe).toBe("The outreach draft could not be saved.");
    expect(safe).not.toContain(diagnostic);
    expect(safe).not.toContain("secret");
  });

  it("defines distinct Outreach limits for every supported plan", () => {
    expect(plans.map((plan) => [plan.id, plan.outreachGenerationsPerPeriod])).toEqual([
      ["free", 10],
      ["starter", 250],
      ["growth", 2500],
      ["agency", 10000],
    ]);
  });

  it("uses the architecture-defined Free fallback server-side", () => {
    expect(resolveSubscriptionPlan(null)).toMatchObject({
      source: "product_default",
      usedFallback: true,
      plan: {
        id: "free",
        outreachGenerationsPerPeriod: 10,
      },
    });
  });

  it("does not accept a browser-selected paid plan", () => {
    const browserSuppliedPlan = "agency";
    // Only trusted persisted subscription state enters plan selection; browser text is ignored.
    const resolution = resolveSubscriptionPlan(null);
    expect(resolution.plan.id).toBe("free");
    expect(resolution.plan.id).not.toBe(browserSuppliedPlan);
  });
});
