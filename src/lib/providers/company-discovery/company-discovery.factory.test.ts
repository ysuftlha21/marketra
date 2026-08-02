import { describe, it, expect } from "vitest";
import { createCompanyDiscoveryProvider } from "./company-discovery.factory";
import { MockCompanyDiscoveryProvider } from "./mock-company-discovery.provider";
import { HunterCompanyDiscoveryProvider } from "../hunter/hunter-company-discovery.provider";
import { HunterClient } from "../hunter/hunter-client";
import type { CompanyDiscoveryInputV1 } from "./company-discovery.provider";

describe("createCompanyDiscoveryProvider", () => {
  it("creates a MockCompanyDiscoveryProvider for 'mock'", () => {
    const p = createCompanyDiscoveryProvider("mock");
    expect(p).toBeInstanceOf(MockCompanyDiscoveryProvider);
    expect(p.id).toBe("mock");
  });

  it("throws for 'external' (not implemented in Phase 1)", () => {
    expect(() => createCompanyDiscoveryProvider("external")).toThrow(
      /External CompanyDiscoveryProvider is not implemented/,
    );
  });

  it("creates the Hunter adapter only when an explicit client is supplied", () => {
    const client = new HunterClient({
      apiKey: "test-only-key",
      baseUrl: "https://api.hunter.io/v2",
      maxRetries: 0,
      timeoutMs: 1_000,
    });

    expect(createCompanyDiscoveryProvider("hunter", { hunterClient: client })).toBeInstanceOf(
      HunterCompanyDiscoveryProvider,
    );
  });

  it("never silently falls back to mock when Hunter is not configured", () => {
    expect(() => createCompanyDiscoveryProvider("hunter")).toThrow(
      "Hunter company discovery is not configured.",
    );
  });
});

const baseInput: Omit<
  CompanyDiscoveryInputV1,
  "correlationId" | "targetCountryCode" | "maxResults"
> = {
  industries: [],
  companyTypes: [],
  qualificationSignals: [],
  disqualificationSignals: [],
  purchaseTriggers: [],
  technologySignals: [],
  exclusionDomains: [],
};

function mk(
  correlationId: string,
  targetCountryCode: string,
  maxResults = 5,
): CompanyDiscoveryInputV1 {
  return { ...baseInput, correlationId, targetCountryCode, maxResults };
}

describe("MockCompanyDiscoveryProvider determinism", () => {
  it("returns deterministic results for the same input", async () => {
    const p = createCompanyDiscoveryProvider("mock");
    const input = mk("test-correlation", "DE");
    const a = await p.discoverCompaniesV1(input);
    const b = await p.discoverCompaniesV1(input);
    expect(a.data.candidates.length).toBe(b.data.candidates.length);
    expect(a.data.candidates[0]?.name).toBe(b.data.candidates[0]?.name);
    expect(a.meta.isMock).toBe(true);
  });

  it("returns candidates with required fields", async () => {
    const p = createCompanyDiscoveryProvider("mock");
    const r = await p.discoverCompaniesV1(mk("test-validate", "DE", 3));
    expect(r.data.candidates.length).toBeGreaterThan(0);
    for (const c of r.data.candidates) {
      expect(c.name).toBeTruthy();
      expect(c.countryCode).toBe("DE");
      expect(c.industry).toBeTruthy();
      expect(c.industryTags).toBeDefined();
    }
  });

  it("respects maxResults parameter", async () => {
    const p = createCompanyDiscoveryProvider("mock");
    const r = await p.discoverCompaniesV1(mk("test-max", "US", 10));
    expect(r.data.candidates.length).toBeLessThanOrEqual(10);
  });

  it("handles industry filter", async () => {
    const p = createCompanyDiscoveryProvider("mock");
    const r = await p.discoverCompaniesV1({
      ...mk("test-industry", "GB", 5),
      industries: ["Fintech"],
    });
    expect(r.data.candidates.length).toBeGreaterThan(0);
  });
});
