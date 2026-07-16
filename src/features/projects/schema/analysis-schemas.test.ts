import { describe, it, expect } from "vitest";
import {
  v1ProductAnalysisInputSchema as productAnalysisInputSchema,
  v1ProductAnalysisResultSchema as productAnalysisResultSchema,
} from "./analysis-schemas";

describe("productAnalysisInputSchema", () => {
  it("accepts valid input", () => {
    const r = productAnalysisInputSchema.safeParse({
      productName: "SupportFlow",
      productDescription: "A customer support ticketing system for B2B SaaS companies.",
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty product name", () => {
    const r = productAnalysisInputSchema.safeParse({
      productName: "",
      productDescription: "Description",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty product description", () => {
    const r = productAnalysisInputSchema.safeParse({
      productName: "SupportFlow",
      productDescription: "",
    });
    expect(r.success).toBe(false);
  });

  it("accepts optional website URL", () => {
    const r = productAnalysisInputSchema.safeParse({
      productName: "SupportFlow",
      productDescription: "Description",
      websiteUrl: "https://example.com",
    });
    expect(r.success).toBe(true);
  });

  it("accepts optional fields", () => {
    const r = productAnalysisInputSchema.safeParse({
      productName: "SupportFlow",
      productDescription: "Description",
      businessModel: "SaaS",
      pricingSummary: "$49/mo",
      currentMarkets: ["US"],
      preferredLanguage: "en",
    });
    expect(r.success).toBe(true);
  });
});

describe("productAnalysisResultSchema", () => {
  const validResult = {
    isMock: true,
    productSummary: "A support ticketing platform for SaaS.",
    coreProblem: "Teams struggle to manage support tickets efficiently.",
    valueProposition: "Reduce response times and improve customer satisfaction.",
    capabilities: ["Ticket management", "Multi-channel support"],
    customerCategories: ["B2B SaaS companies"],
    buyerRoles: ["CEO", "Head of Support"],
    userRoles: ["Support agent", "Team lead"],
    businessModelInterpretation: "SaaS subscription.",
    pricingPositionInterpretation: "Mid-market.",
    purchaseTriggers: ["Growing support volume"],
    adoptionBarriers: ["Integration complexity"],
    maturityObservations: "Early stage.",
    differentiators: ["AI-powered routing"],
    unsupportedClaims: [],
    missingInformation: ["Integration ecosystem"],
    clarificationQuestions: ["What CRM do you use?"],
    positioningStatement: "The support platform for growing SaaS teams.",
    elevatorPitch: "SupportFlow helps you manage tickets across channels.",
    confidence: "medium",
  };

  it("accepts valid result", () => {
    const r = productAnalysisResultSchema.safeParse(validResult);
    expect(r.success).toBe(true);
  });

  it("rejects missing productSummary", () => {
    const r = productAnalysisResultSchema.safeParse({ ...validResult, productSummary: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid confidence", () => {
    const r = productAnalysisResultSchema.safeParse({ ...validResult, confidence: "very-high" });
    expect(r.success).toBe(false);
  });

  it("rejects non-array capabilities", () => {
    const r = productAnalysisResultSchema.safeParse({ ...validResult, capabilities: "string" });
    expect(r.success).toBe(false);
  });

  it("requires isMock boolean", () => {
    const r = productAnalysisResultSchema.safeParse({ ...validResult, isMock: "yes" });
    expect(r.success).toBe(false);
  });
});
