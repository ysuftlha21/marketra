import type { EmailProvider, EmailResult, SendEmailInput } from "./email.provider";
import { randomUUID } from "node:crypto";

function meta(startedAt: number) {
  return {
    providerName: "mock-email",
    isMock: true,
    durationMs: Math.max(1, Date.now() - startedAt),
  };
}

export class MockEmailProvider implements EmailProvider {
  readonly name = "mock-email";
  readonly isMock = true;

  async send(input: SendEmailInput) {
    const startedAt = Date.now();
    const data: EmailResult = {
      isMock: true,
      messageId: `mock_${Date.now()}_${input.to}`,
      status: "sent",
      operationId: input.operationId ?? randomUUID(),
    };
    return { data, meta: meta(startedAt) };
  }
}
