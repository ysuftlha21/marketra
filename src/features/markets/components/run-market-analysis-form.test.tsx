import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RunMarketAnalysisForm } from "./run-market-analysis-form";

const mocks = vi.hoisted(() => ({
  action: vi.fn(),
  state: null as null | { status: string; message: string; reference: string },
  pending: false,
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useActionState: () => [mocks.state, mocks.action, mocks.pending],
}));

vi.mock("../api/market-actions", () => ({ runMarketAnalysisFormAction: vi.fn() }));

describe("RunMarketAnalysisForm", () => {
  beforeEach(() => {
    mocks.action.mockReset();
    mocks.state = null;
    mocks.pending = false;
  });

  it("submits the scoped project and country identifiers", () => {
    render(<RunMarketAnalysisForm projectSlug="marketra" countryId="country-us" />);
    fireEvent.submit(screen.getByRole("button", { name: "Analyze market" }).closest("form")!);
    expect(mocks.action).toHaveBeenCalledOnce();
    const data = mocks.action.mock.calls[0]?.[0] as FormData;
    expect(data.get("projectSlug")).toBe("marketra");
    expect(data.get("countryId")).toBe("country-us");
  });

  it("prevents duplicate submissions and announces progress", () => {
    mocks.pending = true;
    render(<RunMarketAnalysisForm projectSlug="marketra" countryId="country-us" />);
    const button = screen.getByRole("button", { name: "Analyzing market…" });
    expect(button).toBeDisabled();
    expect(button.closest("form")).toHaveAttribute("aria-busy", "true");
  });

  it("renders only the safe failure reference", () => {
    mocks.state = {
      status: "failed",
      message: "Market analysis could not be completed.",
      reference: "AI-PROVIDER-UNAVAILABLE-operation",
    };
    render(<RunMarketAnalysisForm projectSlug="marketra" countryId="country-us" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Reference: AI-PROVIDER-UNAVAILABLE-operation",
    );
  });
});
