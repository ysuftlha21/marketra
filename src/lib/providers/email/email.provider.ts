import { z } from "zod";
import type { ProviderResult } from "../provider-types";

const noHeaderInjection = (value: string) => !/[\r\n]/.test(value);
const senderSchema = z
  .string()
  .min(3)
  .max(320)
  .refine(noHeaderInjection, "Invalid sender.")
  .refine((value) => {
    const match = value.match(/^(?:[A-Za-z0-9 .'-]+\s+<)?([^<>\s]+@[^<>\s]+)>?$/);
    return Boolean(match && z.string().email().safeParse(match[1]).success);
  }, "Invalid sender.");

export const sendEmailInputSchema = z.object({
  to: z.string().email(),
  from: senderSchema,
  subject: z.string().trim().min(1).max(200).refine(noHeaderInjection, "Invalid subject."),
  body: z.string().min(1).max(100_000),
  category: z
    .enum(["workspace_invitation", "system_notification", "account_notification"])
    .default("system_notification"),
  operationId: z.string().uuid().optional(),
});
export type SendEmailInput = z.input<typeof sendEmailInputSchema>;

export const emailResultSchema = z.object({
  isMock: z.boolean(),
  messageId: z.string().min(1),
  status: z.enum(["sent", "failed", "queued"]),
  operationId: z.string().uuid(),
});
export type EmailResult = z.infer<typeof emailResultSchema>;

export interface EmailProvider {
  readonly name: string;
  readonly isMock: boolean;
  send(input: SendEmailInput): Promise<ProviderResult<EmailResult>>;
}
