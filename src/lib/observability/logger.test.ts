import { describe, expect, it } from "vitest";
import { redactLogValue } from "./logger";

describe("observability redaction", () => {
  it("redacts nested secrets and content while preserving safe dimensions", () => {
    expect(
      redactLogValue({
        workspaceId: "w",
        apiKey: "secret",
        nested: {
          prompt: "private",
          billingSignature: "signature",
          databaseUrl: "postgres://secret",
          sessionData: "session",
          durationMs: 4,
        },
      }),
    ).toEqual({
      workspaceId: "w",
      apiKey: "[REDACTED]",
      nested: {
        prompt: "[REDACTED]",
        billingSignature: "[REDACTED]",
        databaseUrl: "[REDACTED]",
        sessionData: "[REDACTED]",
        durationMs: 4,
      },
    });
  });
});
