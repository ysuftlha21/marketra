import { z } from "zod";
import { normalizeDomain } from "@/features/companies/domain/company-normalization";
import { buildMeta } from "../provider-types";
import {
  verificationStatusSchema,
  type EmailEnrichmentProvider,
  type VerificationStatus,
} from "../email-enrichment/email-enrichment.provider";
import type { HunterClient } from "./hunter-client";

const finderSchema = z
  .object({
    data: z
      .object({ email: z.string().email().nullish(), score: z.number().nullish() })
      .passthrough(),
  })
  .passthrough();
const verifierSchema = z
  .object({ data: z.object({ status: z.string(), score: z.number().nullish() }).passthrough() })
  .passthrough();
const combinedSchema = z
  .object({ data: z.record(z.string(), z.unknown()).nullable() })
  .passthrough();
type CachedVerification = { expiresAt: number; status: VerificationStatus; score?: number };

export class HunterEmailEnrichmentProvider implements EmailEnrichmentProvider {
  readonly id = "hunter" as const;
  private readonly cache = new Map<string, CachedVerification>();
  constructor(
    private readonly client: HunterClient,
    private readonly now: () => number = Date.now,
    private readonly cacheTtlMs = 7 * 24 * 60 * 60 * 1000,
  ) {}
  async findEmail(input: { domain: string; firstName: string; lastName: string }) {
    const startedAt = Date.now();
    const domain = normalizeDomain(input.domain);
    if (!domain) throw new Error("A valid company domain is required.");
    const response = finderSchema.parse(
      await this.client.request<unknown>("email_finder", "/email-finder", {
        query: { domain, first_name: input.firstName, last_name: input.lastName },
      }),
    );
    return {
      data: {
        email: response.data.email ?? undefined,
        confidence: response.data.score ?? undefined,
      },
      meta: buildMeta("hunter-email-finder", false, startedAt),
    };
  }
  async verifyEmail(email: string) {
    const startedAt = Date.now();
    const key = email.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > this.now())
      return {
        data: { status: cached.status, score: cached.score, cached: true },
        meta: buildMeta("hunter-email-verifier", false, startedAt),
      };
    const response = verifierSchema.parse(
      await this.client.request<unknown>("email_verification", "/email-verifier", {
        query: { email: key },
      }),
    );
    const status = verificationStatusSchema.safeParse(response.data.status).data ?? "unknown";
    const value = { status, score: response.data.score ?? undefined };
    this.cache.set(key, { ...value, expiresAt: this.now() + this.cacheTtlMs });
    return {
      data: { ...value, cached: false },
      meta: buildMeta("hunter-email-verifier", false, startedAt),
    };
  }
  async combinedEnrichment(email: string) {
    const startedAt = Date.now();
    const response = combinedSchema.parse(
      await this.client.request<unknown>("combined_enrichment", "/combined/find", {
        query: { email: email.trim().toLowerCase() },
      }),
    );
    return { data: response.data, meta: buildMeta("hunter-combined-enrichment", false, startedAt) };
  }
}
