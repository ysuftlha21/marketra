import { describe, it, expect } from "vitest";
import { createAiProvider } from "./ai.factory";
import { MockAiProvider } from "./mock-ai.provider";
import type { AiProvider, IcpProfile, V1ProductAnalysisInput } from "./ai.provider";

const productName = "Acme";
const productDescription =
  "Acme helps teams ship and scale their SaaS platform with automated market analysis and intelligent lead discovery.";
const productSummary = "Acme helps teams ship.";
const countryCode = "US";
const companyName = "Northbeam Labs";
const companyCountryCode = "US";
const recipientRole = "Head of Sales";
const websiteUrl = "https://example.com";

const icp: IcpProfile = {
  isMock: true,
  countryCode: "US",
  industryFit: ["B2B SaaS"],
  employeeRange: "11-50",
  companyType: "Private",
  painPoints: ["x"],
  technologySignals: ["y"],
  buyingSignals: ["z"],
};

describe("createAiProvider", () => {
  it("creates a MockAiProvider for 'mock'", () => {
    const p = createAiProvider("mock");
    expect(p).toBeInstanceOf(MockAiProvider);
    expect(p.isMock).toBe(true);
  });

  it("throws for 'openai' (not implemented in Phase 1)", () => {
    expect(() => createAiProvider("openai")).toThrow(/OpenAiProvider is not implemented/);
  });
});

async function withMock<T>(fn: (p: AiProvider) => Promise<T>): Promise<T> {
  return fn(createAiProvider("mock"));
}

describe("MockAiProvider determinism", () => {
  it("analyzeProduct returns deterministic, mock-flagged data", async () => {
    const a = await withMock((p) => p.analyzeProduct({ productName, websiteUrl }));
    const b = await withMock((p) => p.analyzeProduct({ productName, websiteUrl }));
    expect(a.data.isMock).toBe(true);
    expect(a.data.suggestedVerticals).toEqual(b.data.suggestedVerticals);
    expect(a.meta.isMock).toBe(true);
  });

  it("generateIcp returns deterministic ICP for the country", async () => {
    const r = await withMock((p) => p.generateIcp({ productName, productSummary, countryCode }));
    expect(r.data.isMock).toBe(true);
    expect(r.data.countryCode).toBe("US");
    expect(r.data.industryFit.length).toBeGreaterThan(0);
  });

  it("evaluateCompany returns positive, negative, and missing reasons", async () => {
    const r = await withMock((p) => p.evaluateCompany({ companyName, companyCountryCode, icp }));
    expect(r.data.positiveReasons.length).toBeGreaterThan(0);
    expect(r.data.negativeReasons.length).toBeGreaterThan(0);
    expect(r.data.missingData.length).toBeGreaterThan(0);
  });

  it("generateOutreach returns content in the requested language", async () => {
    const r = await withMock((p) =>
      p.generateOutreach({ companyName, language: "de", recipientRole }),
    );
    expect(r.data.language).toBe("de");
    expect(r.data.subject).toContain(companyName);
  });

  it("analyzeProductV1 returns deterministic, structured V1 data", async () => {
    const input: V1ProductAnalysisInput = {
      schemaVersion: "v1",
      productName,
      productDescription,
      preferredLanguage: "en",
      currentMarkets: ["US", "UK"],
    };
    const a = await withMock((p) => p.analyzeProductV1(input));
    const b = await withMock((p) => p.analyzeProductV1(input));
    expect(a.data.isMock).toBe(true);
    expect(a.data.productSummary).toContain(productName);
    expect(a.data.coreProblem).toBeTruthy();
    expect(a.data.valueProposition).toBeTruthy();
    expect(a.data.capabilities.length).toBeGreaterThan(0);
    expect(a.data.customerCategories.length).toBeGreaterThan(0);
    expect(a.data.buyerRoles.length).toBeGreaterThan(0);
    expect(a.data.confidence).toMatch(/^(low|medium|high)$/);
    expect(a.data.differentiators.length).toBeGreaterThan(0);
    expect(a.data.unsupportedClaims).toBeDefined();
    expect(a.data.missingInformation).toBeDefined();
    expect(a.data.clarificationQuestions.length).toBeGreaterThan(0);
    expect(a.data.positioningStatement).toContain(productName);
    expect(a.data.elevatorPitch).toContain(productName);
    expect(a.data.productSummary).toBe(b.data.productSummary);
    expect(a.meta.isMock).toBe(true);
  });

  it("analyzeProductV1 handles optional website URL", async () => {
    const input: V1ProductAnalysisInput = {
      schemaVersion: "v1",
      productName,
      productDescription,
      websiteUrl: "https://example.com",
      currentMarkets: [],
      preferredLanguage: "en",
    };
    const r = await withMock((p) => p.analyzeProductV1(input));
    expect(r.data.isMock).toBe(true);
    expect(r.data.productSummary).toBeTruthy();
  });
});
