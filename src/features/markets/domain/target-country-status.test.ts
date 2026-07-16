import { describe, it, expect } from "vitest";
import {
  canStartAnalysis,
  canRetryAnalysis,
  canShortlist,
  canReject,
  canRestore,
  canRemove,
  transitionForAnalysisStart,
  targetCountryStatusSchema,
} from "./target-country-status";

describe("targetCountryStatusSchema", () => {
  it("accepts valid statuses", () => {
    const valid = ["selected", "analyzing", "analyzed", "shortlisted", "rejected"];
    for (const s of valid) {
      expect(targetCountryStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it("rejects invalid statuses", () => {
    expect(targetCountryStatusSchema.safeParse("draft").success).toBe(false);
    expect(targetCountryStatusSchema.safeParse("").success).toBe(false);
  });
});

describe("canStartAnalysis", () => {
  it("allows from selected", () => expect(canStartAnalysis("selected")).toBe(true));
  it("allows from analyzed", () => expect(canStartAnalysis("analyzed")).toBe(true));
  it("blocks from analyzing", () => expect(canStartAnalysis("analyzing")).toBe(false));
  it("blocks from shortlisted", () => expect(canStartAnalysis("shortlisted")).toBe(false));
  it("blocks from rejected", () => expect(canStartAnalysis("rejected")).toBe(false));
});

describe("canRetryAnalysis", () => {
  it("allows from analyzed", () => expect(canRetryAnalysis("analyzed")).toBe(true));
  it("blocks from selected", () => expect(canRetryAnalysis("selected")).toBe(false));
});

describe("canShortlist / canReject / canRestore", () => {
  it("canShortlist only from analyzed", () => {
    expect(canShortlist("analyzed")).toBe(true);
    expect(canShortlist("selected")).toBe(false);
  });
  it("canReject from analyzed or shortlisted", () => {
    expect(canReject("analyzed")).toBe(true);
    expect(canReject("shortlisted")).toBe(true);
    expect(canReject("selected")).toBe(false);
  });
  it("canRestore from shortlisted or rejected", () => {
    expect(canRestore("shortlisted")).toBe(true);
    expect(canRestore("rejected")).toBe(true);
    expect(canRestore("selected")).toBe(false);
  });
});

describe("canRemove", () => {
  it("allows removing selected or analyzing", () => {
    expect(canRemove("selected")).toBe(true);
    expect(canRemove("analyzing")).toBe(true);
  });
  it("blocks removing analyzed", () => expect(canRemove("analyzed")).toBe(false));
});

describe("transitionForAnalysisStart", () => {
  it("selected → analyzing", () =>
    expect(transitionForAnalysisStart("selected")).toBe("analyzing"));
  it("analyzed → analyzing", () =>
    expect(transitionForAnalysisStart("analyzed")).toBe("analyzing"));
  it("no-op for other states", () => {
    expect(transitionForAnalysisStart("analyzing")).toBe("analyzing");
    expect(transitionForAnalysisStart("shortlisted")).toBe("shortlisted");
  });
});
