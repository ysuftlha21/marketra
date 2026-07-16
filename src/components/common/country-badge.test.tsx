import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountryBadge } from "./country-badge";

describe("CountryBadge", () => {
  it("renders the country name and flag for a supported country", () => {
    render(<CountryBadge countryCode="DE" />);
    expect(screen.getByText("Germany")).toBeInTheDocument();
  });

  it("is case-insensitive", () => {
    render(<CountryBadge countryCode="us" />);
    expect(screen.getByText("United States")).toBeInTheDocument();
  });

  it("falls back to the upper-cased code for unsupported countries", () => {
    render(<CountryBadge countryCode="zz" />);
    expect(screen.getByText("ZZ")).toBeInTheDocument();
  });

  it("hides the name when showName is false", () => {
    render(<CountryBadge countryCode="FR" showName={false} />);
    expect(screen.queryByText("France")).not.toBeInTheDocument();
  });
});
