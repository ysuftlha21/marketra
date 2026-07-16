import { describe, it, expect } from "vitest";
import { createEmailProvider } from "./email.factory";
import { MockEmailProvider } from "./mock-email.provider";

describe("createEmailProvider", () => {
  it("creates a MockEmailProvider for 'mock'", () => {
    const p = createEmailProvider("mock");
    expect(p).toBeInstanceOf(MockEmailProvider);
    expect(p.isMock).toBe(true);
  });

  it("throws for 'smtp' (not implemented in Phase 1)", () => {
    expect(() => createEmailProvider("smtp")).toThrow(/SMTP EmailProvider is not implemented/);
  });
});
