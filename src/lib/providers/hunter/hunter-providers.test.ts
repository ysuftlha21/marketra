import { describe, expect, it, vi } from "vitest";
import { HunterCompanyDiscoveryProvider } from "./hunter-company-discovery.provider";
import { HunterBuyerDiscoveryProvider } from "./hunter-buyer-discovery.provider";
import { HunterEmailEnrichmentProvider } from "./hunter-email-enrichment.provider";
import type { HunterClient } from "./hunter-client";

const input = {
  correlationId: "op-1",
  targetCountryCode: "DE",
  industries: ["Software"],
  companyTypes: [],
  qualificationSignals: [],
  disqualificationSignals: [],
  purchaseTriggers: [],
  technologySignals: [],
  exclusionDomains: [],
  maxResults: 10,
};

describe("Hunter provider adapters", () => {
  it("normalizes and deduplicates company discovery results", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({
        data: [
          { domain: "www.Example.com", organization: "Example" },
          { domain: "example.com", organization: "Duplicate" },
          { domain: "other.com", organization: "Other" },
        ],
        meta: { results: 3 },
      }),
    } as unknown as HunterClient;
    const result = await new HunterCompanyDiscoveryProvider(client).discoverCompaniesV1(input);
    expect(result.data.candidates.map((candidate) => candidate.normalizedDomain)).toEqual([
      "example.com",
      "other.com",
    ]);
    expect(result.data.candidates[0]?.countryCode).toBe("DE");
    expect(client.request).toHaveBeenCalledWith(
      "company_discovery",
      "/discover",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          headquarters_location: { include: [{ country: "DE" }] },
          industry: { include: ["Software Development"] },
        }),
      }),
    );
  });

  it("normalizes malformed provider output to a controlled error", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ data: "not-an-array" }),
    } as unknown as HunterClient;
    await expect(
      new HunterCompanyDiscoveryProvider(client).discoverCompaniesV1(input),
    ).rejects.toMatchObject({ category: "invalid_response" });
  });

  it("caches company enrichment by normalized domain", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ data: { name: "Example", domain: "example.com" } }),
    } as unknown as HunterClient;
    const provider = new HunterCompanyDiscoveryProvider(client);
    expect((await provider.enrichCompany("www.example.com")).cached).toBe(false);
    expect((await provider.enrichCompany("example.com")).cached).toBe(true);
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it("maps Domain Search contacts without mixing role recommendations", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({
        data: {
          emails: [
            {
              first_name: "Ada",
              last_name: "Lovelace",
              position: "CTO",
              email: "ada@example.com",
              confidence: 92,
            },
          ],
          meta: { results: 1 },
        },
      }),
    } as unknown as HunterClient;
    const result = await new HunterBuyerDiscoveryProvider(client).search({ domain: "example.com" });
    expect(result.data.contacts[0]).toMatchObject({
      fullName: "Ada Lovelace",
      jobTitle: "CTO",
      emailConfidence: 92,
      source: "hunter",
    });
  });

  it("finds and caches email verification results", async () => {
    const client = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ data: { email: "ada@example.com", score: 90 } })
        .mockResolvedValueOnce({ data: { status: "valid", score: 95 } }),
    } as unknown as HunterClient;
    const provider = new HunterEmailEnrichmentProvider(client);
    expect(
      (await provider.findEmail({ domain: "example.com", firstName: "Ada", lastName: "Lovelace" }))
        .data.email,
    ).toBe("ada@example.com");
    expect((await provider.verifyEmail("ADA@example.com")).data.cached).toBe(false);
    expect((await provider.verifyEmail("ada@example.com")).data.cached).toBe(true);
    expect(client.request).toHaveBeenCalledTimes(2);
  });

  it("normalizes undocumented verification states to unknown", async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ data: { status: "new_state" } }),
    } as unknown as HunterClient;
    expect(
      (await new HunterEmailEnrichmentProvider(client).verifyEmail("a@example.com")).data.status,
    ).toBe("unknown");
  });
});
