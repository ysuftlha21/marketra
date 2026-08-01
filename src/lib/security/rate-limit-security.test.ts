import { describe, expect, it } from "vitest";
import { buildRateLimitKey } from "./rate-limit-key";
import { getTrustedClientIp } from "./client-ip";

describe("rate-limit key security", () => {
  it("hashes sensitive and tenant identifiers and separates workspaces", () => {
    const base = {
      namespace: "marketra",
      environment: "test",
      operation: "signup",
      userId: "user-1",
      sensitiveIdentifier: "person@example.com",
    };
    const first = buildRateLimitKey({ ...base, workspaceId: "workspace-a" });
    const second = buildRateLimitKey({ ...base, workspaceId: "workspace-b" });
    expect(first).not.toContain("person@example.com");
    expect(first).not.toContain("workspace-a");
    expect(first).not.toBe(second);
  });
});

describe("trusted client IP", () => {
  it("does not trust arbitrary x-forwarded-for", () => {
    expect(getTrustedClientIp(new Headers({ "x-forwarded-for": "1.2.3.4" }))).toBeNull();
  });
  it("uses the proxy-appended Vercel address and rejects malformed values", () => {
    expect(
      getTrustedClientIp(new Headers({ "x-vercel-forwarded-for": "spoofed, 2001:db8::1" })),
    ).toBe("2001:db8::1");
    expect(getTrustedClientIp(new Headers({ "x-real-ip": "not-an-ip" }))).toBeNull();
  });
});
