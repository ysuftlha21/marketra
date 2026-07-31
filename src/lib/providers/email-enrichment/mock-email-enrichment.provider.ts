import { buildMeta } from "../provider-types";
import type { EmailEnrichmentProvider } from "./email-enrichment.provider";

export class MockEmailEnrichmentProvider implements EmailEnrichmentProvider {
  readonly id = "mock" as const;
  async findEmail(input: { domain: string; firstName: string; lastName: string }) {
    const startedAt = Date.now();
    const local = `${input.firstName}.${input.lastName}`.toLowerCase().replace(/[^a-z.]/g, "");
    return {
      data: { email: `${local}@${input.domain}`, confidence: 90 },
      meta: buildMeta("mock-email-finder", true, startedAt),
    };
  }
  async verifyEmail() {
    const startedAt = Date.now();
    return {
      data: { status: "valid" as const, score: 90, cached: false },
      meta: buildMeta("mock-email-verifier", true, startedAt),
    };
  }
  async combinedEnrichment() {
    const startedAt = Date.now();
    return { data: null, meta: buildMeta("mock-combined-enrichment", true, startedAt) };
  }
}
