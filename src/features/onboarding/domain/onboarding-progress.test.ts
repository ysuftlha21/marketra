import { describe, expect, it } from "vitest";
import { deriveOnboardingProgress } from "./onboarding-progress";

describe("onboarding progress", () => {
  it("returns the first incomplete deterministic step", () => {
    const progress = deriveOnboardingProgress({
      hasWorkspace: true,
      hasProject: true,
      hasMarket: false,
      hasCompany: false,
      hasDecisionRole: false,
      hasOutreach: false,
    });
    expect(progress.nextStep).toBe("market");
    expect(progress.completed.size).toBe(2);
  });
  it("is complete only when a useful outreach result exists", () => {
    const progress = deriveOnboardingProgress({
      hasWorkspace: true,
      hasProject: true,
      hasMarket: true,
      hasCompany: true,
      hasDecisionRole: true,
      hasOutreach: true,
    });
    expect(progress.complete).toBe(true);
  });
});
