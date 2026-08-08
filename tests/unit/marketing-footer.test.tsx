import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

describe("marketing footer", () => {
  it("groups platform, trust, and legal navigation accessibly", () => {
    render(<MarketingFooter />);

    expect(screen.getByRole("link", { name: "Marketra home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("navigation", { name: "Platform links" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Trust links" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Legal links" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "hello@getmarketra.com" })).toHaveAttribute(
      "href",
      "mailto:hello@getmarketra.com",
    );
  });
});
