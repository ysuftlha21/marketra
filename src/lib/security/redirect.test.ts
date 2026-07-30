import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env/runtime-env", () => ({
  NEXT_PUBLIC_APP_URL: "https://app.marketra.dev",
  getPublicAppUrl: () => "https://app.marketra.dev",
}));

const { sanitizeAuthCallbackRedirect, sanitizeRedirect } = await import("./redirect");

describe("sanitizeRedirect", () => {
  const fallback = "/dashboard";

  it("returns the fallback when next is null", () => {
    expect(sanitizeRedirect(null, fallback)).toBe(fallback);
  });

  it("returns the fallback when next is undefined", () => {
    expect(sanitizeRedirect(undefined, fallback)).toBe(fallback);
  });

  it("returns the fallback when next is an empty string", () => {
    expect(sanitizeRedirect("", fallback)).toBe(fallback);
  });

  it("allows a same-origin path", () => {
    expect(sanitizeRedirect("/settings", fallback)).toBe("/settings");
  });

  it("allows a same-origin full URL", () => {
    const result = sanitizeRedirect("https://app.marketra.dev/settings", fallback);
    expect(result).toBe("/settings");
  });

  it("rejects an external URL and returns the fallback", () => {
    const result = sanitizeRedirect("https://evil.com/phish", fallback);
    expect(result).toBe(fallback);
  });

  it("rejects a protocol-relative URL with external host", () => {
    const result = sanitizeRedirect("//evil.com/phish", fallback);
    expect(result).toBe(fallback);
  });

  it("rejects javascript: URLs", () => {
    const result = sanitizeRedirect("javascript:alert(1)", fallback);
    expect(result).toBe(fallback);
  });

  it("rejects a data: URL", () => {
    const result = sanitizeRedirect("data:text/html,<script>alert(1)</script>", fallback);
    expect(result).toBe(fallback);
  });

  it("rejects an external URL with subdomain of app", () => {
    const result = sanitizeRedirect("https://evil.app.marketra.dev/phish", fallback);
    expect(result).toBe(fallback);
  });

  it("rejects localhost when the configured application origin is not localhost", () => {
    expect(sanitizeRedirect("http://localhost/admin", fallback)).toBe(fallback);
  });

  it("preserves query params and hash for same-origin URLs", () => {
    const result = sanitizeRedirect("/reset-password?code=abc#section", fallback);
    expect(result).toBe("/reset-password?code=abc#section");
  });

  it("falls back to / when no fallback is provided", () => {
    expect(sanitizeRedirect("https://evil.com")).toBe("/");
  });
});

describe("sanitizeAuthCallbackRedirect", () => {
  it.each(["/dashboard", "/onboarding", "/reset-password"])(
    "allows the explicit auth callback path %s",
    (path) => {
      expect(sanitizeAuthCallbackRedirect(path)).toBe(path);
    },
  );

  it.each(["/internal/path", "https://evil.com/phish", "//evil.com/phish", "/dashboard/settings"])(
    "rejects non-allowlisted auth callback destinations: %s",
    (path) => {
      expect(sanitizeAuthCallbackRedirect(path)).toBe("/dashboard");
    },
  );
});
