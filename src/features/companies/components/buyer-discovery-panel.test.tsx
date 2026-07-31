import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BuyerDiscoveryPanel } from "./buyer-discovery-panel";
import * as actions from "../api/buyer-workflow-actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../api/buyer-workflow-actions", () => ({
  discoverBuyersAction: vi.fn(),
  revealBuyerEmailAction: vi.fn(),
  handoffBuyerToOutreachAction: vi.fn(),
}));

const contact = {
  id: "00000000-0000-4000-8000-000000000001",
  workspace_id: "w",
  project_id: "p",
  company_id: "c",
  provider_id: "mock" as const,
  first_name: "Alex",
  last_name: "Morgan",
  full_name: "Alex Morgan",
  job_title: "VP Growth",
  department: "marketing",
  seniority: "executive",
  professional_profile_url: null,
  email_address: null,
  email_status: "found" as const,
  email_confidence: 90,
  fetched_at: new Date(0).toISOString(),
  verified_at: null,
};

describe("BuyerDiscoveryPanel", () => {
  it("shows provenance and never enriches automatically", () => {
    render(
      <BuyerDiscoveryPanel
        projectId="00000000-0000-4000-8000-000000000002"
        companyId="00000000-0000-4000-8000-000000000003"
        contacts={[contact]}
        providerLabel="Demo / Mock"
      />,
    );
    expect(screen.getByText("Demo / Mock")).toBeVisible();
    expect(screen.getByText(/coverage may be incomplete/i)).toBeVisible();
    expect(actions.revealBuyerEmailAction).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before revealing an email", async () => {
    vi.mocked(actions.revealBuyerEmailAction).mockResolvedValue({
      ok: true,
      data: { status: "verified", email: "redacted@example.com", cached: false },
      operationId: "op",
    });
    render(
      <BuyerDiscoveryPanel
        projectId="00000000-0000-4000-8000-000000000002"
        companyId="00000000-0000-4000-8000-000000000003"
        contacts={[contact]}
        providerLabel="Demo / Mock"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reveal email" }));
    expect(screen.getByRole("dialog", { name: "Reveal this email?" })).toBeVisible();
    expect(actions.revealBuyerEmailAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and reveal" }));
    expect(actions.revealBuyerEmailAction).toHaveBeenCalledWith(
      expect.objectContaining({ confirmed: "true" }),
    );
  });
});
