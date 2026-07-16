import { describe, it, expect } from "vitest";
import { createProjectSchema, updateProjectSchema } from "./project-schemas";

describe("createProjectSchema", () => {
  const valid = {
    name: "SupportFlow Demo",
    productDescription:
      "A customer support ticketing system for B2B SaaS companies that helps teams manage and prioritize tickets efficiently across multiple channels.",
    currentMarkets: ["US"],
    preferredLanguage: "en",
  };

  it("accepts valid minimal input", () => {
    const r = createProjectSchema.safeParse(valid);
    if (!r.success) console.error(r.error.issues);
    expect(r.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const r = createProjectSchema.safeParse({ ...valid, name: "A" });
    expect(r.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const r = createProjectSchema.safeParse({ ...valid, name: "A".repeat(101) });
    expect(r.success).toBe(false);
  });

  it("rejects product description shorter than 20 characters", () => {
    const r = createProjectSchema.safeParse({ ...valid, productDescription: "Too short" });
    expect(r.success).toBe(false);
  });

  it("rejects product description longer than 5000 characters", () => {
    const r = createProjectSchema.safeParse({
      ...valid,
      productDescription: "A".repeat(5001),
    });
    expect(r.success).toBe(false);
  });

  it("accepts an HTTPS website URL", () => {
    const r = createProjectSchema.safeParse({
      ...valid,
      websiteUrl: "https://example.com",
    });
    expect(r.success).toBe(true);
  });

  it("rejects javascript: URLs", () => {
    const r = createProjectSchema.safeParse({
      ...valid,
      websiteUrl: "javascript:alert(1)",
    });
    expect(r.success).toBe(false);
  });

  it("rejects localhost URLs", () => {
    const r = createProjectSchema.safeParse({
      ...valid,
      websiteUrl: "http://localhost:3000",
    });
    expect(r.success).toBe(false);
  });

  it("rejects private IP URLs", () => {
    const r = createProjectSchema.safeParse({
      ...valid,
      websiteUrl: "http://192.168.1.1",
    });
    expect(r.success).toBe(false);
  });

  it("accepts empty or no website URL", () => {
    const r1 = createProjectSchema.safeParse(valid);
    const r2 = createProjectSchema.safeParse({ ...valid, websiteUrl: "" });
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });

  it("accepts optional fields", () => {
    const r = createProjectSchema.safeParse({
      ...valid,
      targetCustomerSummary: "B2B SaaS companies with 10-50 employees",
      businessModel: "SaaS subscription",
      pricingSummary: "$49/mo starter",
      currentMarkets: ["US", "DE", "GB"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects slug with invalid characters", () => {
    const r = createProjectSchema.safeParse({ ...valid, slug: "My Project!" });
    expect(r.success).toBe(false);
  });

  it("accepts valid slug", () => {
    const r = createProjectSchema.safeParse({ ...valid, slug: "my-project" });
    expect(r.success).toBe(true);
  });
});

describe("updateProjectSchema", () => {
  it("accepts partial update", () => {
    const r = updateProjectSchema.safeParse({ name: "New Name" });
    expect(r.success).toBe(true);
  });

  it("accepts empty object", () => {
    const r = updateProjectSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("accepts status change", () => {
    const r = updateProjectSchema.safeParse({ status: "archived" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const r = updateProjectSchema.safeParse({ status: "invalid" });
    expect(r.success).toBe(false);
  });
});
