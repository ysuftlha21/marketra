import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));

import { SmtpEmailProvider } from "./smtp-email.provider";

const input = { to: "to@example.com", from: "from@example.com", subject: "Subject", body: "Body" };
const config = {
  host: "smtp.example.com",
  port: 587,
  user: "user",
  password: "secret",
  timeoutMs: 100,
  maxRetries: 1,
};

describe("SmtpEmailProvider", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns a controlled delivery result", async () => {
    sendMail.mockResolvedValue({ messageId: "message-1" });
    await expect(new SmtpEmailProvider(config).send(input)).resolves.toMatchObject({
      data: { messageId: "message-1", status: "sent" },
    });
  });
  it("retries a bounded transient error and maps final timeout", async () => {
    sendMail.mockRejectedValue(Object.assign(new Error("socket"), { code: "ESOCKET" }));
    await expect(new SmtpEmailProvider(config).send(input)).rejects.toMatchObject({
      code: "timeout",
    });
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});
