/**
 * Provider-agnostic domain types shared across provider interfaces.
 * These keep vendor SDKs out of application code and AI/business services.
 */

export type ProviderKind =
  | "ai"
  | "leads"
  | "market"
  | "billing"
  | "email"
  | "analytics"
  | "company_discovery"
  | "buyer_discovery"
  | "email_enrichment";

export interface ProviderRunMeta {
  readonly providerName: string;
  readonly isMock: boolean;
  readonly durationMs: number;
  readonly tokens?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly reasoningTokens?: number;
  readonly cachedInputTokens?: number;
  readonly cacheWriteInputTokens?: number;
  readonly modelId?: string;
  readonly estimatedCostUsd?: number;
  readonly finishReason?: string;
  readonly validationCategory?: string;
  readonly invalidFieldPaths?: readonly string[];
  readonly retryAttempted?: boolean;
  readonly providerCalls?: number;
  readonly operationId?: string;
  readonly attempts?: readonly ProviderAttemptMeta[];
}

export interface ProviderAttemptMeta {
  readonly durationMs: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly tokens?: number;
  readonly modelId?: string;
  readonly finishReason?: string;
  readonly success: boolean;
  readonly controlledErrorCode?: string;
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
