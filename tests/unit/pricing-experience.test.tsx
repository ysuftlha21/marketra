import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PricingExperience } from "@/features/pricing/components/pricing-experience";
import { pricingPlans } from "@/config/pricing-page";

describe("pricing experience", () => {
  it("renders all configured plans and the recommended Growth state", () => {
    render(<PricingExperience />);
    for (const plan of pricingPlans)
      expect(screen.getByRole("heading", { name: plan.name })).toBeInTheDocument();
    expect(screen.getByText(/Recommended/)).toBeInTheDocument();
    expect(screen.getByText("Custom Pricing")).toBeInTheDocument();
  });
  it("updates annual prices and preserves the interval in registration links", () => {
    render(<PricingExperience />);
    fireEvent.click(screen.getByRole("button", { name: /^annual/i }));
    expect(screen.getByText(/^\$490/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      expect.stringContaining("interval=annual"),
    );
  });
  it("opens contact sales and expands FAQ items", () => {
    render(<PricingExperience />);
    fireEvent.click(screen.getByRole("button", { name: "Contact Sales" }));
    expect(screen.getByRole("dialog", { name: "Contact Sales" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close contact sales" }));
    const faq = screen.getByRole("button", { name: "Do you offer annual pricing?" });
    fireEvent.click(faq);
    expect(faq).toHaveAttribute("aria-expanded", "true");
  });
  it("does not display unsupported certification claims", () => {
    render(<PricingExperience />);
    expect(screen.queryByText(/SOC\s?2/i)).not.toBeInTheDocument();
  });
});
