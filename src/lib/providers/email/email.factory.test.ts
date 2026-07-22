import { describe, it, expect } from "vitest";
import { createEmailProvider } from "./email.factory";
import { MockEmailProvider } from "./mock-email.provider";

describe("createEmailProvider", () => {
  it("creates a MockEmailProvider for 'mock'", () => {
    const p = createEmailProvider("mock");
    expect(p).toBeInstanceOf(MockEmailProvider);
    expect(p.isMock).toBe(true);
  });

  it("requires complete credentials for 'smtp'", () => {
    expect(() => createEmailProvider("smtp")).toThrow(/credentials are unavailable/);
  });
});
