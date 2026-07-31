import { describe, expect, it } from "vitest";
import { buyerSearchSchema, revealEmailSchema } from "./hunter-workflow-schema";

describe("Hunter workflow schemas", () => {
  it("bounds buyer pagination", () => {
    expect(
      buyerSearchSchema.safeParse({
        projectId: "00000000-0000-4000-8000-000000000001",
        companyId: "00000000-0000-4000-8000-000000000002",
        page: 1,
        pageSize: 25,
      }).success,
    ).toBe(true);
    expect(
      buyerSearchSchema.safeParse({
        projectId: "00000000-0000-4000-8000-000000000001",
        companyId: "00000000-0000-4000-8000-000000000002",
        page: 1,
        pageSize: 100,
      }).success,
    ).toBe(false);
  });

  it("rejects reveal requests without literal confirmation", () => {
    const base = {
      projectId: "00000000-0000-4000-8000-000000000001",
      companyId: "00000000-0000-4000-8000-000000000002",
      contactId: "00000000-0000-4000-8000-000000000003",
    };
    expect(revealEmailSchema.safeParse(base).success).toBe(false);
    expect(revealEmailSchema.safeParse({ ...base, confirmed: "true" }).success).toBe(true);
  });
});
