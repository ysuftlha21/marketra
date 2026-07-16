import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the status label", () => {
    render(<StatusBadge status="won" />);
    expect(screen.getByText("won")).toBeInTheDocument();
  });

  it("uses a custom label when provided", () => {
    render(<StatusBadge status="active" label="Live" />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("falls back to a neutral tone for unknown statuses", () => {
    render(<StatusBadge status="totally-unknown" />);
    expect(screen.getByText("totally-unknown")).toBeInTheDocument();
  });
});
