import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock sanitizeRedirect to verify it's called correctly.
const mockSanitizeRedirect = vi.fn((next: string, fallback: string) => {
  if (next === "https://evil.com") return fallback;
  return next || fallback;
});

vi.mock("@/lib/security/redirect", () => ({
  sanitizeRedirect: mockSanitizeRedirect,
}));

// Mock createServerClient to simulate exchangeCodeForSession outcomes.
const mockExchangeCodeForSession = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}));

const { GET } = await import("./route");

function makeRequest(url: string): NextRequest {
  return new NextRequest(new Request(url));
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects to sign-in when code is missing", async () => {
    const req = makeRequest("https://app.marketra.dev/auth/callback");
    const resp = await GET(req);
    expect(resp.status).toBe(307);
    expect(resp.headers.get("location")).toContain("/sign-in?error=callback");
  });

  it("redirects to sign-in when code is empty", async () => {
    const req = makeRequest("https://app.marketra.dev/auth/callback?code=");
    const resp = await GET(req);
    expect(resp.status).toBe(307);
    expect(resp.headers.get("location")).toContain("/sign-in?error=callback");
  });

  it("redirects to sign-in when Supabase config is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    const req = makeRequest("https://app.marketra.dev/auth/callback?code=abc123");
    const resp = await GET(req);
    expect(resp.status).toBe(307);
    expect(resp.headers.get("location")).toContain("/sign-in?error=config");
  });

  it("redirects to dashboard after successful code exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const req = makeRequest("https://app.marketra.dev/auth/callback?code=valid-code");
    const resp = await GET(req);
    expect(resp.status).toBe(307);
    expect(resp.headers.get("location")).toContain("/dashboard");
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid-code");
  });

  it("respects the next parameter after successful exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const req = makeRequest(
      "https://app.marketra.dev/auth/callback?code=valid-code&next=/reset-password",
    );
    const resp = await GET(req);
    expect(resp.status).toBe(307);
    expect(resp.headers.get("location")).toContain("/reset-password");
  });

  it("redirects to sign-in when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: new Error("Invalid code"),
    });

    const req = makeRequest("https://app.marketra.dev/auth/callback?code=bad-code");
    const resp = await GET(req);
    expect(resp.status).toBe(307);
    expect(resp.headers.get("location")).toContain("/sign-in?error=callback");
  });

  it("uses sanitizeRedirect to reject unsafe next parameter", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const req = makeRequest(
      "https://app.marketra.dev/auth/callback?code=valid-code&next=https://evil.com",
    );
    const resp = await GET(req);
    expect(resp.status).toBe(307);
    // Should fall back to /dashboard when evil.com is rejected.
    expect(resp.headers.get("location")).toContain("/dashboard");
  });

  it("does not log the code parameter", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const req = makeRequest("https://app.marketra.dev/auth/callback?code=secret-code-123");
    await GET(req);

    for (const spy of [consoleSpy, consoleWarnSpy, consoleErrorSpy]) {
      const calls = spy.mock.calls.flat().map(String);
      const leaked = calls.filter((c) => c.includes("secret-code-123"));
      expect(leaked).toHaveLength(0);
      spy.mockRestore();
    }
  });

  it("does not log the next parameter", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const req = makeRequest(
      "https://app.marketra.dev/auth/callback?code=valid&next=/internal/path",
    );
    await GET(req);

    for (const spy of [consoleSpy, consoleWarnSpy, consoleErrorSpy]) {
      const calls = spy.mock.calls.flat().map(String);
      const leaked = calls.filter((c) => c.includes("/internal/path"));
      expect(leaked).toHaveLength(0);
      spy.mockRestore();
    }
  });
});
