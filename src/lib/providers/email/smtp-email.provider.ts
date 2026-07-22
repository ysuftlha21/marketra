import nodemailer from "nodemailer";
import type { EmailProvider, SendEmailInput } from "./email.provider";
import { buildMeta } from "../provider-types";

export interface SmtpEmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  timeoutMs: number;
  maxRetries: number;
}

export class EmailProviderError extends Error {
  constructor(
    readonly code: "timeout" | "delivery_failed",
    message: string,
  ) {
    super(message);
    this.name = "EmailProviderError";
  }
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  readonly isMock = false;
  private readonly transport;

  constructor(private readonly config: SmtpEmailConfig) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: config.timeoutMs,
      socketTimeout: config.timeoutMs,
    });
  }

  async send(input: SendEmailInput) {
    const startedAt = Date.now();
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      try {
        const result = await this.transport.sendMail({
          to: input.to,
          from: input.from,
          subject: input.subject,
          text: input.body,
        });
        return {
          data: { isMock: false, messageId: result.messageId, status: "sent" as const },
          meta: buildMeta(this.name, false, startedAt),
        };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error ? String(error.code) : "";
        const retryable = ["ETIMEDOUT", "ESOCKET", "ECONNECTION"].includes(code);
        if (retryable && attempt < this.config.maxRetries) continue;
        if (retryable) throw new EmailProviderError("timeout", "Email delivery timed out.");
        throw new EmailProviderError("delivery_failed", "Email could not be delivered.");
      }
    }
    throw new EmailProviderError("delivery_failed", "Email could not be delivered.");
  }
}
