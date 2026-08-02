import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }));

vi.mock("@/lib/env/env", () => ({
  parseServerEnv: vi.fn(() => ({
    HUNTER_API_KEY: "server-only",
    HUNTER_BASE_URL: "https://api.hunter.io/v2",
    HUNTER_DISCOVERY_UI_ENABLED: false,
    HUNTER_TIMEOUT_MS: 15000,
    HUNTER_MAX_RETRIES: 0,
    DEFAULT_COMPANY_DISCOVERY_PROVIDER: "hunter",
  })),
}));

vi.mock("./hunter-config", () => ({
  createHunterClient: () => ({ request: mockRequest }),
}));

describe("getHunterReadiness", () => {
  beforeEach(() => mockRequest.mockReset());
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

  it("authenticates through the free account endpoint without returning account data", async () => {
    mockRequest.mockResolvedValueOnce({ data: { private: "not-returned" } });
    const { checkHunterReadiness } = await import("./hunter-readiness");
    await expect(checkHunterReadiness()).resolves.toMatchObject({
      configured: true,
      authenticated: true,
      discoveryAccessible: false,
    });
    expect(mockRequest).toHaveBeenCalledWith("hunter_readiness_account", "/account");
  });

  it("returns only a safe authentication category", async () => {
    const { HunterProviderError } = await import("./hunter-client");
    mockRequest.mockRejectedValueOnce(new HunterProviderError("authentication", 401));
    const { checkHunterReadiness } = await import("./hunter-readiness");
    const result = await checkHunterReadiness();
    expect(result).toMatchObject({
      configured: true,
      authenticated: false,
      discoveryAccessible: false,
      category: "authentication_failed",
    });
    expect(JSON.stringify(result)).not.toContain("server-only");
  });
});
