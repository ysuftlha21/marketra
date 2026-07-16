import type { EmailProvider, EmailResult, SendEmailInput } from "./email.provider";

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
    };
    return { data, meta: meta(startedAt) };
  }
}
