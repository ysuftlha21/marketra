import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, productionSecurityHeaders } from "./headers.mjs";

describe("security headers", () => {
  it("disables eval in production and prevents framing", () => {
    const csp = buildContentSecurityPolicy(true);
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
  it("adds HSTS only in production", () => {
    expect(productionSecurityHeaders(true)).toContainEqual(
      expect.objectContaining({ key: "Strict-Transport-Security" }),
    );
    expect(productionSecurityHeaders(false)).not.toContainEqual(
      expect.objectContaining({ key: "Strict-Transport-Security" }),
    );
  });
});
