import { z } from "zod";
import type { ProviderResult } from "../provider-types";

export const sendEmailInputSchema = z.object({
  to: z.string().email(),
  from: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});
export type SendEmailInput = z.infer<typeof sendEmailInputSchema>;

export const emailResultSchema = z.object({
  isMock: z.boolean(),
  messageId: z.string().min(1),
  status: z.enum(["sent", "failed", "queued"]),
});
export type EmailResult = z.infer<typeof emailResultSchema>;

export interface EmailProvider {
  readonly name: string;
  readonly isMock: boolean;
  send(input: SendEmailInput): Promise<ProviderResult<EmailResult>>;
}
