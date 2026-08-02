import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdaptCountryIcpForm } from "./adapt-country-icp-form";
import { GenerateCountryIcpForm } from "./generate-country-icp-form";

const hook = vi.hoisted(() => ({
  state: null as null | { status: string; message: string; operationId: string },
  pending: false,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => [hook.state, vi.fn(), hook.pending],
  };
});

vi.mock("../api/icp-actions", () => ({
  adaptCountryIcpAction: vi.fn(),
  generateCountryIcpFormAction: vi.fn(),
}));

describe("country ICP action forms", () => {
  beforeEach(() => {
    hook.state = null;
    hook.pending = false;
  });

  it("wires the deterministic adaptation identifiers to an accessible submit button", () => {
    const { container } = render(
      <AdaptCountryIcpForm
        projectSlug="marketra"
        countryId="country-us"
        countryCode="US"
        countryName="United States"
      />,
    );
    expect(screen.getByRole("button", { name: "Adapt ICP for United States" })).toHaveAttribute(
      "type",
      "submit",
    );
    expect(container.querySelector('input[name="projectSlug"]')).toHaveValue("marketra");
    expect(container.querySelector('input[name="countryCode"]')).toHaveValue("US");
  });

  it("disables repeated submissions and announces the pending state", () => {
    hook.pending = true;
    render(
      <AdaptCountryIcpForm
        projectSlug="marketra"
        countryId="country-us"
        countryCode="US"
        countryName="United States"
      />,
    );
    expect(screen.getByRole("button", { name: "Creating ICP…" })).toBeDisabled();
  });

  it("renders a safe persistence reference without raw errors", () => {
    hook.state = {
      status: "persistence_failed",
      message: "The ICP could not be saved.",
      operationId: "safe-operation",
    };
    render(
      <AdaptCountryIcpForm
        projectSlug="marketra"
        countryId="country-us"
        countryCode="US"
        countryName="United States"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "The ICP could not be saved. Reference: ICP-CREATE-safe-operation",
    );
  });

  it("labels AI generation separately when no reusable source exists", () => {
    render(
      <GenerateCountryIcpForm projectSlug="marketra" countryId="country-us" countryCode="US" />,
    );
    expect(screen.getByRole("button", { name: "Generate ICP with AI" })).toBeInTheDocument();
  });
});
