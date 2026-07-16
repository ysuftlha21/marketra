import type { AnalyticsProvider, AnalyticsResult, TrackEventInput } from "./analytics.provider";

function meta(startedAt: number) {
  return {
    providerName: "mock-analytics",
    isMock: true,
    durationMs: Math.max(1, Date.now() - startedAt),
  };
}

export class MockAnalyticsProvider implements AnalyticsProvider {
  readonly name = "mock-analytics";
  readonly isMock = true;

  async track(_: TrackEventInput) {
    const startedAt = Date.now();
    const data: AnalyticsResult = { isMock: true, ok: true };
    return { data, meta: meta(startedAt) };
  }
}
