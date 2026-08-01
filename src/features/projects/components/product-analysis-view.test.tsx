import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductAnalysisView } from "./product-analysis-view";

describe("ProductAnalysisView", () => {
  it("renders a successfully normalized V2 product analysis", () => {
    render(
      <ProductAnalysisView
        output={{
          schemaVersion: "v2",
          positioning: "Focused positioning",
          valueProposition: "Clear value",
          businessModel: "Subscription",
          pricingInterpretation: "Tiered",
          targetCustomerSegments: ["SaaS teams"],
          primaryPainPoints: ["Slow research"],
          keyCapabilities: ["Market analysis"],
          differentiators: ["Country context"],
          competitorCategories: ["Research tools"],
        }}
        meta={{ provider: "openai", promptVersion: "product-analysis-v2", confidence: "high" }}
      />,
    );
    expect(screen.getByText("Focused positioning")).toBeInTheDocument();
    expect(screen.getByText("Clear value")).toBeInTheDocument();
    expect(screen.getByText("SaaS teams")).toBeInTheDocument();
    expect(screen.getByText(/Confidence:/)).toBeInTheDocument();
  });
});
