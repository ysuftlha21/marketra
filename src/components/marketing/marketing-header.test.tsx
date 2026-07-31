import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingHeader } from "./marketing-header";

const { getSession, onAuthStateChange, unsubscribe } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/sign-in" }));
vi.mock("@/lib/db/supabase-browser", () => ({
  createBrowserClient: () => ({ auth: { getSession, onAuthStateChange } }),
}));

describe("MarketingHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: null } });
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
  });

  it("renders one non-shrinking Marketra home link before the desktop navigation", () => {
    render(<MarketingHeader />);

    const header = screen.getByRole("banner");
    const brandLinks = within(header).getAllByRole("link", { name: "Marketra home" });
    const productLink = within(header).getByRole("link", { name: "Product" });

    expect(brandLinks).toHaveLength(1);
    const brandLink = brandLinks[0];
    expect(brandLink).toBeDefined();
    if (!brandLink) throw new Error("Expected the shared Marketra brand link.");
    expect(brandLink).toHaveAttribute("href", "/");
    expect(brandLink).toHaveClass("shrink-0", "min-h-11");
    expect(
      brandLink.compareDocumentPosition(productLink) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps the canonical mark and wordmark assets inside the shared brand link", () => {
    render(<MarketingHeader />);

    const brand = within(screen.getByRole("banner")).getByRole("link", {
      name: "Marketra home",
    });
    const logoImages = within(brand).getAllByRole("img", { name: "Marketra" });

    expect(logoImages).toHaveLength(2);
    expect(logoImages.map((image) => image.getAttribute("src"))).toEqual(
      expect.arrayContaining([
        expect.stringContaining("marketra-logo-dark.png"),
        expect.stringContaining("marketra-logo-light.png"),
      ]),
    );
  });
});
