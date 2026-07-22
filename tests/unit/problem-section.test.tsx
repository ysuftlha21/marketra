import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProblemSection } from "@/components/landing/problem/problem-section";
import { problemSection } from "@/config/problem-section";

describe("problem section", () => {
  it("renders all config-driven problem and comparison content", () => {
    render(<ProblemSection />);
    expect(
      screen.getByRole("heading", { name: /Global expansion still runs on guesswork/i }),
    ).toBeInTheDocument();
    for (const card of problemSection.cards) {
      expect(screen.getByRole("heading", { name: card.title })).toBeInTheDocument();
      expect(screen.getByText(card.status)).toBeInTheDocument();
    }
    expect(
      screen.getByRole("heading", { name: problemSection.comparison.without.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: problemSection.comparison.with.title }),
    ).toBeInTheDocument();
  });
});
