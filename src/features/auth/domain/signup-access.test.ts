import { describe, expect, it } from "vitest";
import { canCreateAccount, normalizeSignupAllowlist } from "./signup-access";

describe("closed-beta signup access", () => {
  it("normalizes, deduplicates, and lowercases entries", () => {
    expect(normalizeSignupAllowlist(" Founder@Example.com, @Beta.io,founder@example.com ")).toEqual(
      ["founder@example.com", "@beta.io"],
    );
  });
  it("allows every valid email only in open mode", () => {
    expect(canCreateAccount({ mode: "open", email: "a@example.com", allowlist: [] })).toBe(true);
    expect(canCreateAccount({ mode: "disabled", email: "a@example.com", allowlist: [] })).toBe(
      false,
    );
  });
  it("supports exact email and whole-domain entries without substring matches", () => {
    const allowlist = normalizeSignupAllowlist("owner@example.com,@beta.io");
    expect(canCreateAccount({ mode: "allowlist", email: "owner@example.com", allowlist })).toBe(
      true,
    );
    expect(canCreateAccount({ mode: "invite_only", email: "user@beta.io", allowlist })).toBe(true);
    expect(
      canCreateAccount({ mode: "allowlist", email: "owner@example.com.evil", allowlist }),
    ).toBe(false);
  });
});
