import type { EmailProvider } from "./email.provider";
import { MockEmailProvider } from "./mock-email.provider";

export type EmailProviderId = "mock" | "smtp";

export function createEmailProvider(id: EmailProviderId): EmailProvider {
  switch (id) {
    case "mock":
      return new MockEmailProvider();
    case "smtp":
      throw new Error(
        "SMTP EmailProvider is not implemented in Phase 1. Set DEFAULT_EMAIL_PROVIDER=mock.",
      );
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown email provider: ${String(exhaustive)}`);
    }
  }
}
