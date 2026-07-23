import { describe, expect, it } from "vitest";
import { companyProvenance, PROVENANCE_LABEL } from "./data-provenance";

describe("company data provenance", () => {
  it("keeps manual and Mock data visibly distinct", () => {
    expect(PROVENANCE_LABEL[companyProvenance("manual")]).toBe("Manually entered");
    expect(PROVENANCE_LABEL[companyProvenance("mock")]).toBe("Demo data");
  });
  it("labels configured non-Mock providers without exposing technical IDs", () => {
    expect(PROVENANCE_LABEL[companyProvenance("selected-provider")]).toBe("External source");
  });
});
