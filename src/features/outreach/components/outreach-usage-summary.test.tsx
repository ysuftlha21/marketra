import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OutreachUsageSummary } from "@/features/outreach/components/outreach-usage-summary";

describe("OutreachUsageSummary component", () => {
  it("renders usage bounds accurately", () => {
    render(<OutreachUsageSummary used={5} limit={10} remaining={5} />);

    // "Outreach: 5 / 10"
    expect(screen.getByText(/Outreach:/)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("/ 10")).toBeInTheDocument();

    // No warnings or limit reached messages
    expect(screen.queryByText("Limit reached")).not.toBeInTheDocument();
    expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
  });

  it("renders warning when remaining is 3 or less", () => {
    render(<OutreachUsageSummary used={8} limit={10} remaining={2} />);

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("2 remaining")).toBeInTheDocument();
    expect(screen.getByText("2 remaining")).toHaveClass("text-warning");
  });

  it("renders limit reached when remaining is 0", () => {
    render(<OutreachUsageSummary used={10} limit={10} remaining={0} />);

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Limit reached")).toBeInTheDocument();
    expect(screen.getByText("Limit reached")).toHaveClass("text-danger");
  });

  it("handles over-limit gracefully", () => {
    render(<OutreachUsageSummary used={12} limit={10} remaining={-2} />);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Limit reached")).toBeInTheDocument();
  });
});
