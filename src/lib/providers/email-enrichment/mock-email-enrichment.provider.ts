import { buildMeta } from "../provider-types";
import type { EmailEnrichmentProvider } from "./email-enrichment.provider";

export class MockEmailEnrichmentProvider implements EmailEnrichmentProvider {
  readonly id = "mock" as const;
  async findEmail() {
    const startedAt = Date.now();
    return { data: {}, meta: buildMeta("mock-email-finder", true, startedAt) };
  }
  async verifyEmail() {
    const startedAt = Date.now();
    return {
      data: { status: "unknown" as const, cached: false },
      meta: buildMeta("mock-email-verifier", true, startedAt),
    };
  }
  async combinedEnrichment() {
    const startedAt = Date.now();
    return { data: null, meta: buildMeta("mock-combined-enrichment", true, startedAt) };
  }
}
