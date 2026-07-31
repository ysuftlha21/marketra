import type {
  EmailEnrichmentProvider,
  EmailEnrichmentProviderId,
} from "./email-enrichment.provider";
import { MockEmailEnrichmentProvider } from "./mock-email-enrichment.provider";
import { HunterEmailEnrichmentProvider } from "../hunter/hunter-email-enrichment.provider";
import type { HunterClient } from "../hunter/hunter-client";

export function createEmailEnrichmentProvider(
  id: EmailEnrichmentProviderId,
  options?: { hunterClient?: HunterClient },
): EmailEnrichmentProvider {
  if (id === "mock") return new MockEmailEnrichmentProvider();
  if (!options?.hunterClient) throw new Error("Hunter email enrichment is not configured.");
  return new HunterEmailEnrichmentProvider(options.hunterClient);
}
