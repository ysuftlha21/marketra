import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env/env";

describe("legal configuration", () => {
  it("validates effective date metadata and support contact", () => {
    const env = parseServerEnv({
      LEGAL_EFFECTIVE_DATE: "2026-07-23",
      SUPPORT_EMAIL: "support@example.com",
    });
    expect(env.LEGAL_EFFECTIVE_DATE).toBe("2026-07-23");
    expect(env.SUPPORT_EMAIL).toBe("support@example.com");
  });
  it("rejects an invalid support address", () => {
    expect(() => parseServerEnv({ SUPPORT_EMAIL: "not-an-email" })).toThrow();
  });
});
