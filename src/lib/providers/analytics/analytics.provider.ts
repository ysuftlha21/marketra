import { z } from "zod";
import type { ProviderResult } from "../provider-types";

export const trackEventInputSchema = z.object({
  event: z.string().min(1),
  workspaceId: z.string().min(1),
  properties: z.record(z.string(), z.unknown()).default({}),
});
export type TrackEventInput = z.infer<typeof trackEventInputSchema>;

export const analyticsResultSchema = z.object({
  isMock: z.boolean(),
  ok: z.boolean(),
});
export type AnalyticsResult = z.infer<typeof analyticsResultSchema>;

export interface AnalyticsProvider {
  readonly name: string;
  readonly isMock: boolean;
  track(input: TrackEventInput): Promise<ProviderResult<AnalyticsResult>>;
}
