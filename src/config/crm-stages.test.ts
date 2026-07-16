import { describe, it, expect } from "vitest";
import { getCrmStagesOrdered, getCrmStage, crmStages } from "./crm-stages";

describe("crmStages", () => {
  it("has eight stages in the MVP set", () => {
    expect(crmStages.length).toBe(8);
  });

  it("getCrmStagesOrdered preserves order ascending", () => {
    const ordered = getCrmStagesOrdered();
    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i]!.order).toBeGreaterThanOrEqual(ordered[i - 1]!.order);
    }
  });

  it("getCrmStage finds a known stage", () => {
    expect(getCrmStage("won")?.name).toBe("Won");
  });

  it("getCrmStage returns undefined for unknown", () => {
    expect(getCrmStage("bogus")).toBeUndefined();
  });
});
