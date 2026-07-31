import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env/env", () => ({
  parseServerEnv: vi.fn(() => ({
    HUNTER_API_KEY: "server-only",
    HUNTER_BASE_URL: "https://api.hunter.io/v2",
    HUNTER_DISCOVERY_UI_ENABLED: false,
  })),
}));

describe("getHunterReadiness", () => {
  it("checks configuration without calling Hunter or consuming credits", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { getHunterReadiness } = await import("./hunter-readiness");
    expect(getHunterReadiness()).toEqual({
      configured: true,
      enabled: false,
      message: "Hunter is configured but UI activation remains disabled.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
