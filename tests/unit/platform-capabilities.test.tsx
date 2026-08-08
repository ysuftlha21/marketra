import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlatformCapabilities } from "@/components/landing/platform-capabilities";

describe("platform capabilities", () => {
  it("presents the complete product as a research-led expansion workflow", () => {
    const { container } = render(<PlatformCapabilities />);

    for (const capability of [
      "AI Market Research",
      "Country Analysis",
      "ICP Builder",
      "Market Opportunity Scoring",
      "Company Intelligence",
      "Decision Maker Research",
      "AI Communication Assistant",
      "Expansion Campaigns",
      "Expansion Workspace",
    ]) {
      expect(screen.getByRole("heading", { name: capability })).toBeInTheDocument();
    }

    expect(container).toHaveTextContent("CRM activity");
    expect(container).toHaveTextContent("analytics");
  });

  it("does not use list-selling or unsolicited-marketing positioning", () => {
    const { container } = render(<PlatformCapabilities />);

    expect(container.textContent).not.toMatch(
      /lead database|lead provider|marketing list|cold email|bulk email|email scraping|unlimited leads|mass emailing/i,
    );
  });
});
