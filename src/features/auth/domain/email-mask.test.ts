import { describe, expect, it } from "vitest";
import { maskEmail } from "./email-mask";

describe("maskEmail", () => {
  it("masks the recipient local part while retaining recognizable context", () => {
    expect(maskEmail("founder@example.com")).toBe("fo•••••@example.com");
    expect(maskEmail("a@example.com")).toBe("a•••@example.com");
  });

  it("does not echo malformed or missing input", () => {
    expect(maskEmail(null)).toBe("your email address");
    expect(maskEmail("not-an-email")).toBe("your email address");
  });
});
