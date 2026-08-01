import OpenAI from "openai";
import { randomUUID } from "node:crypto";
import type { OpenAiModelId } from "@/config/openai-models";
import { classifyOpenAiError, type AiProviderErrorCode } from "./openai-client";
import { logOperation } from "@/lib/observability/logger";
import { z } from "zod";
import { OPENAI_MODEL_IDS } from "@/config/openai-models";

export interface OpenAiReadinessResult {
  providerConfigured: boolean;
  authenticationValid: boolean;
  modelConfigured: boolean;
  modelAccessible: boolean;
  errorCategory: AiProviderErrorCode | null;
  operationId: string;
}

export function resolveOpenAiReadinessConfig(source: Record<string, string | undefined>) {
  return z
    .object({
      OPENAI_API_KEY: z.string().min(1),
      OPENAI_MODEL: z.enum(OPENAI_MODEL_IDS),
      OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().max(60_000).default(15_000),
    })
    .parse(source);
}

export async function checkOpenAiReadiness(config: {
  apiKey?: string;
  model?: OpenAiModelId;
  timeoutMs: number;
  retrieveModel?: (model: OpenAiModelId) => Promise<{ id: string }>;
}): Promise<OpenAiReadinessResult> {
  const operationId = randomUUID();
  const providerConfigured = Boolean(config.apiKey);
  const modelConfigured = Boolean(config.model);
  if (!config.apiKey || !config.model) {
    return {
      providerConfigured,
      authenticationValid: false,
      modelConfigured,
      modelAccessible: false,
      errorCategory: "provider_unavailable",
      operationId,
    };
  }

  const startedAt = Date.now();
  try {
    const retrieveModel =
      config.retrieveModel ??
      (async (modelId: OpenAiModelId) => {
        const client = new OpenAI({
          apiKey: config.apiKey,
          timeout: config.timeoutMs,
          maxRetries: 0,
        });
        return client.models.retrieve(modelId);
      });
    const model = await retrieveModel(config.model);
    const modelAccessible = model.id === config.model;
    logOperation({
      operationId,
      operationType: "openai_readiness",
      providerId: "openai",
      durationMs: Math.max(1, Date.now() - startedAt),
      success: modelAccessible,
      controlledErrorCode: modelAccessible ? undefined : "model_not_found",
      environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    });
    return {
      providerConfigured: true,
      authenticationValid: true,
      modelConfigured: true,
      modelAccessible,
      errorCategory: modelAccessible ? null : "model_not_found",
      operationId,
    };
  } catch (error) {
    const errorCategory = classifyOpenAiError(error);
    logOperation({
      operationId,
      operationType: "openai_readiness",
      providerId: "openai",
      durationMs: Math.max(1, Date.now() - startedAt),
      success: false,
      controlledErrorCode: errorCategory,
      environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    });
    return {
      providerConfigured: true,
      authenticationValid: !["invalid_api_key", "provider_unavailable", "timeout"].includes(
        errorCategory,
      ),
      modelConfigured: true,
      modelAccessible: false,
      errorCategory,
      operationId,
    };
  }
}
