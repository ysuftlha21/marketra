import { describe, it, expect } from "vitest";
import { createLeadProvider } from "./lead.factory";

const searchInput = { countryCode: "DE", page: 1, pageSize: 25, industries: [] };

describe("createLeadProvider", () => {
  it("creates a mock for 'mock'/'manual'/'csv'", () => {
    expect(createLeadProvider("mock").isMock).toBe(true);
    expect(createLeadProvider("manual").isMock).toBe(true);
    expect(createLeadProvider("csv").isMock).toBe(true);
  });

  it("throws for 'external' in Phase 1", () => {
    expect(() => createLeadProvider("external")).toThrow(/ExternalLeadProvider is not implemented/);
  });
});

describe("MockLeadProvider behavior", () => {
  it("searchCompanies returns deterministic mock page", async () => {
    const p = createLeadProvider("mock");
    const a = await p.searchCompanies(searchInput);
    const b = await p.searchCompanies(searchInput);
    expect(a.data.isMock).toBe(true);
    expect(a.data.items).toEqual(b.data.items);
    expect(a.data.items.every((i) => i.isMock)).toBe(true);
  });

  it("enrichCompany returns enriched = true", async () => {
    const p = createLeadProvider("mock");
    const r = await p.enrichCompany({ companyId: "c1", website: "https://example.com" });
    expect(r.data.enriched).toBe(true);
    expect(r.data.isMock).toBe(true);
  });

  it("findDecisionMakers returns roles (not personal contact data)", async () => {
    const p = createLeadProvider("mock");
    const r = await p.findDecisionMakers({ companyId: "c1" });
    expect(r.data.recommendedRoles.length).toBeGreaterThan(0);
    expect(r.data.isMock).toBe(true);
  });
});
