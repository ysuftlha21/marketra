import { describe, expect, it } from "vitest";
import { sendEmailInputSchema } from "./email.provider";

describe("email delivery input", () => {
  const valid = {
    to: "operator@example.com",
    from: "Marketra <no-reply@example.com>",
    subject: "Notice",
    body: "Body",
  };
  it("accepts an approved transactional message", () => {
    expect(sendEmailInputSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    { ...valid, to: "not-an-email" },
    { ...valid, from: "Marketra\r\nBcc: victim@example.com <no-reply@example.com>" },
    { ...valid, subject: "Notice\r\nBcc: victim@example.com" },
  ])("rejects invalid addresses and header injection", (input) => {
    expect(sendEmailInputSchema.safeParse(input).success).toBe(false);
  });
});
