import { describe, expect, it } from "vitest";
import { metadata } from "@/app/page";

describe("landing page metadata", () => {
  it("positions Marketra as a market intelligence and expansion platform", () => {
    expect(metadata.title).toBe("AI-Powered Market Intelligence for International Expansion");
    expect(metadata.description).toContain("AI market research");
    expect(metadata.keywords).toEqual(
      expect.arrayContaining([
        "AI Market Intelligence",
        "International Expansion",
        "Go-To-Market Intelligence",
        "ICP Builder",
        "Company Intelligence",
      ]),
    );
    expect(metadata.alternates).toEqual({ canonical: "https://getmarketra.com/" });
  });
});
