import { z } from "zod";
import type { ProviderResult } from "../provider-types";

export const emailEnrichmentProviderIdSchema = z.enum(["mock", "hunter"]);
export type EmailEnrichmentProviderId = z.infer<typeof emailEnrichmentProviderIdSchema>;
export const verificationStatusSchema = z.enum([
  "valid",
  "invalid",
  "accept_all",
  "webmail",
  "disposable",
  "unknown",
]);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;
export interface EmailEnrichmentProvider {
  readonly id: EmailEnrichmentProviderId;
  findEmail(input: {
    domain: string;
    firstName: string;
    lastName: string;
  }): Promise<ProviderResult<{ email?: string; confidence?: number }>>;
  verifyEmail(
    email: string,
  ): Promise<ProviderResult<{ status: VerificationStatus; score?: number; cached: boolean }>>;
  combinedEnrichment(email: string): Promise<ProviderResult<Record<string, unknown> | null>>;
}
