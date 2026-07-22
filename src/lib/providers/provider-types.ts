/**
 * Provider-agnostic domain types shared across provider interfaces.
 * These keep vendor SDKs out of application code and AI/business services.
 */

export type ProviderKind = "ai" | "leads" | "market" | "billing" | "email" | "analytics";

export interface ProviderRunMeta {
  readonly providerName: string;
  readonly isMock: boolean;
  readonly durationMs: number;
  readonly tokens?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly modelId?: string;
  readonly estimatedCostUsd?: number;
}

export interface ProviderResult<T> {
  readonly data: T;
  readonly meta: ProviderRunMeta;
}

export function buildMeta(
  providerName: string,
  isMock: boolean,
  startedAt: number,
  meta?: Partial<ProviderRunMeta>,
): ProviderRunMeta {
  return {
    providerName,
    isMock,
    durationMs: Math.max(1, Date.now() - startedAt),
    ...meta,
  };
}
