import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { exchangeCodeForSession, verifyOtp, loadAuthContext } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  loadAuthContext: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { exchangeCodeForSession, verifyOtp },
  }),
}));
vi.mock("@/lib/auth/session", () => ({ loadAuthContext }));

const { GET } = await import("./route");

function makeRequest(url: string): NextRequest {
  return new NextRequest(new Request(url));
}

function successfulExchange() {
  exchangeCodeForSession.mockResolvedValue({
    data: { session: { access_token: "never-logged" } },
    error: null,
  });
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each([
    "https://app.marketra.dev/auth/callback",
    "https://app.marketra.dev/auth/callback?code=",
  ])("redirects missing codes to a controlled sign-in error", async (url) => {
    const response = await GET(makeRequest(url));
    expect(response.headers.get("location")).toBe(
      "https://app.marketra.dev/sign-in?error=callback",
    );
  });

  it("redirects missing configuration to a controlled sign-in error", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const response = await GET(makeRequest("https://app.marketra.dev/auth/callback?code=valid"));
    expect(response.headers.get("location")).toContain("/sign-in?error=config");
  });

  it("routes a confirmed user without a workspace to onboarding", async () => {
    successfulExchange();
    loadAuthContext.mockResolvedValue({
      user: { id: "user-1", email: "founder@example.com" },
      displayName: "Founder",
      activeWorkspace: null,
    });

    const response = await GET(
      makeRequest("https://app.marketra.dev/auth/callback?code=valid&next=/dashboard"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("valid");
    expect(response.headers.get("location")).toBe("https://app.marketra.dev/onboarding");
  });

  it("routes a ready confirmed user to the dashboard", async () => {
    successfulExchange();
    loadAuthContext.mockResolvedValue({
      user: { id: "user-1", email: "founder@example.com" },
      displayName: "Founder",
      activeWorkspace: {
        workspace: { id: "workspace-1", name: "Acme", slug: "acme" },
        role: "owner",
        memberships: [],
      },
    });

    const response = await GET(makeRequest("https://app.marketra.dev/auth/callback?code=valid"));

    expect(response.headers.get("location")).toBe("https://app.marketra.dev/dashboard");
  });

  it("preserves the allowlisted recovery destination", async () => {
    successfulExchange();
    const response = await GET(
      makeRequest("https://app.marketra.dev/auth/callback?code=valid&next=/reset-password"),
    );

    expect(response.headers.get("location")).toBe("https://app.marketra.dev/reset-password");
    expect(loadAuthContext).not.toHaveBeenCalled();
  });

  it("verifies a direct email token without exposing it", async () => {
    verifyOtp.mockResolvedValue({
      data: { session: { access_token: "never-logged" } },
      error: null,
    });
    loadAuthContext.mockResolvedValue({
      user: { id: "user-1", email: null },
      displayName: null,
      activeWorkspace: null,
    });

    const response = await GET(
      makeRequest(
        "https://app.marketra.dev/auth/callback?token_hash=private-token&type=signup&next=/dashboard",
      ),
    );

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "private-token",
      type: "signup",
    });
    expect(response.headers.get("location")).toBe("https://app.marketra.dev/onboarding");
  });

  it.each(["https://evil.example/steal", "//evil.example/steal", "/internal/path"])(
    "rejects a non-allowlisted callback destination: %s",
    async (next) => {
      successfulExchange();
      loadAuthContext.mockResolvedValue({
        user: { id: "user-1", email: null },
        displayName: null,
        activeWorkspace: null,
      });

      const request = makeRequest(
        `https://app.marketra.dev/auth/callback?code=valid&next=${encodeURIComponent(next)}`,
      );
      const response = await GET(request);
      expect(response.headers.get("location")).toBe("https://app.marketra.dev/onboarding");
    },
  );

  it("redirects exchange and readiness failures with safe error codes", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: new Error("raw provider response"),
    });
    const exchangeFailure = await GET(
      makeRequest("https://app.marketra.dev/auth/callback?code=bad"),
    );
    expect(exchangeFailure.headers.get("location")).toContain("/sign-in?error=callback");

    successfulExchange();
    loadAuthContext.mockRejectedValue(new Error("database details"));
    const readinessFailure = await GET(
      makeRequest("https://app.marketra.dev/auth/callback?code=valid"),
    );
    expect(readinessFailure.headers.get("location")).toContain("/sign-in?error=readiness");
  });

  it("does not log auth codes, next values, email, or session data", async () => {
    const consoleSpies = [
      vi.spyOn(console, "log").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
    ];
    successfulExchange();
    loadAuthContext.mockResolvedValue({
      user: { id: "user-1", email: "private@example.com" },
      displayName: null,
      activeWorkspace: null,
    });

    await GET(
      makeRequest("https://app.marketra.dev/auth/callback?code=secret-code&next=%2Fdashboard"),
    );

    const output = consoleSpies.flatMap((spy) => spy.mock.calls.flat()).join(" ");
    expect(output).not.toMatch(/secret-code|private@example\.com|access_token|dashboard/);
    consoleSpies.forEach((spy) => spy.mockRestore());
  });
});
