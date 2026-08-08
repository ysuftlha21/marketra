import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { pricingPlans } from "@/config/pricing-page";
import { PricingExperience } from "@/features/pricing/components/pricing-experience";

describe("pricing experience", () => {
  it("uses the exact public plan names and prices", () => {
    expect(
      pricingPlans.map(({ id, name, monthlyPrice, annualPrice }) => ({
        id,
        name,
        monthlyPrice,
        annualPrice,
      })),
    ).toEqual([
      { id: "starter", name: "Starter", monthlyPrice: 29, annualPrice: 290 },
      { id: "growth", name: "Pro", monthlyPrice: 79, annualPrice: 790 },
      { id: "agency", name: "Growth", monthlyPrice: 199, annualPrice: 1990 },
    ]);
  });

  it("renders all plans with one trial action per card", () => {
    render(<PricingExperience />);
    for (const plan of pricingPlans) {
      expect(screen.getByRole("heading", { name: plan.name })).toBeInTheDocument();
    }
    expect(screen.getByText(/Recommended/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Start Free Trial" })).toHaveLength(3);
    expect(screen.queryByText(/Custom Pricing|Contact Sales|Enterprise/)).not.toBeInTheDocument();
  });

  it("updates yearly prices and preserves the interval in registration links", () => {
    render(<PricingExperience />);
    fireEvent.click(screen.getByRole("button", { name: /^yearly/i }));
    expect(screen.getByText(/^\$290/)).toBeInTheDocument();
    expect(screen.getByText(/^\$790/)).toBeInTheDocument();
    expect(screen.getByText(/^\$1990/)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Start Free Trial" })
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/sign-up?plan=starter&interval=annual&trial=true",
      "/sign-up?plan=growth&interval=annual&trial=true",
      "/sign-up?plan=agency&interval=annual&trial=true",
    ]);
  });

  it("expands FAQ items accessibly", () => {
    render(<PricingExperience />);
    const faq = screen.getByRole("button", { name: "Do you offer annual pricing?" });
    fireEvent.click(faq);
    expect(faq).toHaveAttribute("aria-expanded", "true");
  });

  it("does not display unsupported certification claims", () => {
    render(<PricingExperience />);
    expect(screen.queryByText(/SOC\s?2/i)).not.toBeInTheDocument();
  });
});
