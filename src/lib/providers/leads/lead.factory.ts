import type { LeadProvider } from "./lead.provider";
import { MockLeadProvider } from "./mock-leads.provider";

export type LeadProviderId = "mock" | "manual" | "csv" | "external";

export function createLeadProvider(id: LeadProviderId): LeadProvider {
  switch (id) {
    case "mock":
      return new MockLeadProvider();
    case "manual":
    case "csv":
      return new MockLeadProvider();
    case "external":
      throw new Error(
        "ExternalLeadProvider is not implemented in Phase 1. Set DEFAULT_LEAD_PROVIDER=mock.",
      );
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown lead provider: ${String(exhaustive)}`);
    }
  }
}
