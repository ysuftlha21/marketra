import type { EmailProvider } from "./email.provider";
import { MockEmailProvider } from "./mock-email.provider";
import { SmtpEmailProvider } from "./smtp-email.provider";
import { parseServerEnv } from "@/lib/env/env";

export type EmailProviderId = "mock" | "smtp";

export function createEmailProvider(id: EmailProviderId): EmailProvider {
  switch (id) {
    case "mock":
      return new MockEmailProvider();
    case "smtp":
      const env = parseServerEnv();
      if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
        throw new Error("SMTP provider credentials are unavailable.");
      }
      return new SmtpEmailProvider({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        timeoutMs: env.SMTP_TIMEOUT_MS,
        maxRetries: env.SMTP_MAX_RETRIES,
      });
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown email provider: ${String(exhaustive)}`);
    }
  }
}
