import type { AnalyticsProvider } from "./analytics.provider";
import { MockAnalyticsProvider } from "./mock-analytics.provider";

export type AnalyticsProviderId = "mock" | "external";

export function createAnalyticsProvider(id: AnalyticsProviderId): AnalyticsProvider {
  switch (id) {
    case "mock":
      return new MockAnalyticsProvider();
    case "external":
      throw new Error(
        "External AnalyticsProvider is not implemented in Phase 1. Set DEFAULT_ANALYTICS_PROVIDER=mock.",
      );
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown analytics provider: ${String(exhaustive)}`);
    }
  }
}
