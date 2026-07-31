import { beforeEach, describe, expect, it, vi } from "vitest";

const getCompany = vi.fn();
const getContact = vi.fn();
const saveContacts = vi.fn();
const updateEmail = vi.fn();
const createLead = vi.fn();
const buyerSearch = vi.fn();
const findEmail = vi.fn();
const verifyEmail = vi.fn();
const allowance = vi.fn();
const record = vi.fn();

vi.mock("../repository/buyer-workflow-repository", () => ({
  getSavedCompanyContext: (...args: unknown[]) => getCompany(...args),
  getBuyerContact: (...args: unknown[]) => getContact(...args),
  upsertBuyerContacts: (...args: unknown[]) => saveContacts(...args),
  updateBuyerEmail: (...args: unknown[]) => updateEmail(...args),
  createOutreachLead: (...args: unknown[]) => createLead(...args),
}));
vi.mock("@/lib/env/env", () => ({
  parseServerEnv: () => ({
    DEFAULT_BUYER_DISCOVERY_PROVIDER: "mock",
    DEFAULT_EMAIL_ENRICHMENT_PROVIDER: "mock",
  }),
}));
vi.mock("@/lib/providers/hunter/hunter-operation-policy", () => ({
  authorizeHunterOperation: vi.fn(async (input) => {
    if (!(await input.authorize(input))) throw new Error("not available");
  }),
}));
vi.mock("@/lib/providers/buyer-discovery/buyer-discovery.factory", () => ({
  createBuyerDiscoveryProvider: () => ({ search: buyerSearch }),
}));
vi.mock("@/lib/providers/email-enrichment/email-enrichment.factory", () => ({
  createEmailEnrichmentProvider: () => ({ findEmail, verifyEmail }),
}));
vi.mock("./provider-usage-service", () => ({
  assertProviderAllowance: (...args: unknown[]) => allowance(...args),
  recordProviderOperation: (...args: unknown[]) => record(...args),
}));

const base = { workspaceId: "w", userId: "u", projectId: "p", companyId: "c" };

describe("buyer workflow service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allowance.mockResolvedValue({ used: 0, limit: 10, remaining: 10 });
    record.mockResolvedValue(undefined);
    getCompany.mockResolvedValue({ primary_domain: "example.com" });
    getContact.mockResolvedValue({
      id: "contact",
      first_name: "Alex",
      last_name: "Morgan",
      email_address: null,
      verified_at: null,
    });
    saveContacts.mockResolvedValue(undefined);
    updateEmail.mockResolvedValue(undefined);
  });

  it("discovers and ranks buyers without persisting provider email addresses", async () => {
    buyerSearch.mockResolvedValue({
      data: {
        contacts: [
          {
            fullName: "Alex Morgan",
            firstName: "Alex",
            lastName: "Morgan",
            email: "private@example.com",
            emailAvailable: true,
            jobTitle: "VP",
            seniority: "executive",
            source: "mock",
            fetchedAt: new Date(0).toISOString(),
          },
        ],
        totalCount: 1,
      },
      meta: {},
    });
    const result = await (
      await import("./buyer-workflow-service")
    ).discoverBuyers({ ...base, page: 1, pageSize: 10 });
    expect(result.ok).toBe(true);
    expect(saveContacts).toHaveBeenCalledWith("w", "p", "c", [
      expect.objectContaining({ email_address: null, email_status: "found" }),
    ]);
  });

  it("reuses a recent verified email without provider calls", async () => {
    getContact.mockResolvedValue({
      id: "contact",
      first_name: "Alex",
      last_name: "Morgan",
      email_address: "cached@example.com",
      email_status: "verified",
      verified_at: new Date().toISOString(),
    });
    const result = await (
      await import("./buyer-workflow-service")
    ).revealBuyerEmail({ ...base, contactId: "contact" });
    expect(result).toMatchObject({ ok: true, data: { cached: true, status: "verified" } });
    expect(findEmail).not.toHaveBeenCalled();
    expect(verifyEmail).not.toHaveBeenCalled();
  });

  it("records email find and verification separately", async () => {
    findEmail.mockResolvedValue({ data: { email: "alex@example.com", confidence: 80 }, meta: {} });
    verifyEmail.mockResolvedValue({
      data: { status: "accept_all", score: 70, cached: false },
      meta: {},
    });
    const result = await (
      await import("./buyer-workflow-service")
    ).revealBuyerEmail({ ...base, contactId: "contact" });
    expect(result).toMatchObject({ ok: true, data: { status: "risky" } });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ operation: "email_find" }));
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ operation: "email_verify" }));
  });

  it("makes outreach handoff idempotency visible", async () => {
    createLead.mockResolvedValue("duplicate");
    const result = await (
      await import("./buyer-workflow-service")
    ).handoffBuyerToOutreach({ ...base, contactId: "contact" });
    expect(result).toMatchObject({ ok: true, data: { state: "duplicate" } });
  });
});
