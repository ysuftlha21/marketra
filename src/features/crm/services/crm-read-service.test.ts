import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  listCrmCompanySources: vi.fn(),
  listCrmRelatedActivity: vi.fn(),
}));

vi.mock("../repository/crm-repository", () => repository);

import { deriveCrmStage, getCrmEntries } from "./crm-read-service";

describe("CRM derived lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.listCrmCompanySources.mockResolvedValue([
      {
        id: "pc-1",
        companyId: "company-1",
        targetCountryId: "market-1",
        status: "approved",
        fitScore: 91,
        reviewed: true,
        updatedAt: "2026-01-01T00:00:00.000Z",
        companyName: "Acme",
        companyDomain: "acme.test",
        industry: "Software",
        countryCode: "US",
        sourceProvider: "hunter",
      },
    ]);
    repository.listCrmRelatedActivity.mockResolvedValue([
      {
        companyId: "company-1",
        buyerCount: 2,
        draftCount: 1,
        latestDraftAt: "2026-01-02T00:00:00.000Z",
      },
    ]);
  });

  it("derives only stages supported by stored evidence", () => {
    expect(deriveCrmStage("discovered", 0, 0)).toBe("discovered");
    expect(deriveCrmStage("approved", 0, 0)).toBe("qualified");
    expect(deriveCrmStage("shortlisted", 1, 0)).toBe("qualified");
    expect(deriveCrmStage("approved", 1, 1)).toBe("outreach-pending");
    expect(deriveCrmStage("rejected", 2, 2)).toBe("lost");
  });

  it("aggregates company, buyer and draft evidence without exposing reviewer IDs", async () => {
    const entries = await getCrmEntries({ workspaceId: "workspace", projectId: "project" });
    expect(entries[0]).toMatchObject({
      companyName: "Acme",
      sourceProvider: "hunter",
      buyerCount: 2,
      draftCount: 1,
      stage: "outreach-pending",
      ownerLabel: "Workspace member",
      nextAction: "review_outreach",
    });
    expect(JSON.stringify(entries)).not.toContain("user-");
  });

  it("passes workspace/project/market scope and applies lifecycle filters", async () => {
    const entries = await getCrmEntries({
      workspaceId: "workspace",
      projectId: "project",
      targetCountryId: "market-1",
      stage: "qualified",
    });
    expect(repository.listCrmCompanySources).toHaveBeenCalledWith(
      "workspace",
      "project",
      "market-1",
    );
    expect(entries).toEqual([]);
  });

  it("never invents sent or engagement activity", () => {
    const stages = [deriveCrmStage("approved", 1, 2), deriveCrmStage("shortlisted", 1, 0)];
    expect(stages).not.toContain("outreach-sent");
    expect(stages).not.toContain("engaged");
  });
});
