import { describe, it, expect } from "vitest";
import {
  addTargetCountrySchema,
  updateTargetCountrySchema,
  changeCountryStatusSchema,
} from "./target-country-schemas";

describe("addTargetCountrySchema", () => {
  it("accepts valid input", () => {
    const r = addTargetCountrySchema.safeParse({ projectSlug: "my-project", countryCode: "DE" });
    expect(r.success).toBe(true);
  });
  it("rejects invalid country code", () => {
    expect(
      addTargetCountrySchema.safeParse({ projectSlug: "p", countryCode: "GERMANY" }).success,
    ).toBe(false);
    expect(addTargetCountrySchema.safeParse({ projectSlug: "p", countryCode: "" }).success).toBe(
      false,
    );
  });
  it("rejects empty slug", () => {
    expect(addTargetCountrySchema.safeParse({ projectSlug: "", countryCode: "DE" }).success).toBe(
      false,
    );
  });
});

describe("updateTargetCountrySchema", () => {
  it("accepts notes only", () => {
    expect(updateTargetCountrySchema.safeParse({ notes: "test" }).success).toBe(true);
  });
  it("accepts priority 1-5", () => {
    expect(updateTargetCountrySchema.safeParse({ priority: 3 }).success).toBe(true);
    expect(updateTargetCountrySchema.safeParse({ priority: 0 }).success).toBe(false);
    expect(updateTargetCountrySchema.safeParse({ priority: 6 }).success).toBe(false);
  });
  it("accepts empty object", () => {
    expect(updateTargetCountrySchema.safeParse({}).success).toBe(true);
  });
  it("rejects notes too long", () => {
    expect(updateTargetCountrySchema.safeParse({ notes: "a".repeat(2001) }).success).toBe(false);
  });
});

describe("changeCountryStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const s of ["selected", "analyzed", "shortlisted", "rejected"]) {
      expect(changeCountryStatusSchema.safeParse({ status: s }).success).toBe(true);
    }
  });
  it("rejects invalid status", () => {
    expect(changeCountryStatusSchema.safeParse({ status: "deleted" }).success).toBe(false);
  });
});
