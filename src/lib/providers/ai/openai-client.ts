import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions/completions";
import { z } from "zod";
import type { ProviderRunMeta } from "../provider-types";
import { createHash, randomUUID } from "node:crypto";
import { logOperation } from "@/lib/observability/logger";
import {
  getOpenAiModelDefinition,
  type OpenAiModelId,
  type OpenAiReasoningEffort,
} from "@/config/openai-models";

export interface OpenAiClientConfig {
  apiKey: string;
  model: OpenAiModelId;
  reasoningEffort?: OpenAiReasoningEffort;
  timeoutMs: number;
  maxRetries: number;
  maxOutputTokens?: number;
}

export type AiProviderErrorCode =
  | "model_not_found"
  | "model_access_denied"
  | "invalid_api_key"
  | "insufficient_quota"
  | "rate_limited"
  | "invalid_request"
  | "timeout"
  | "structured_output_invalid"
  | "provider_unavailable";

export class AiProviderError extends Error {
  constructor(
    readonly code: AiProviderErrorCode,
    message: string,
    readonly operationId: string = randomUUID(),
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export class StructuredOpenAiClient {
  private readonly client: OpenAI;

  constructor(private readonly config: OpenAiClientConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs,
      maxRetries: Math.min(config.maxRetries, 2),
    });
  }

  async generate<T>(operation: string, input: unknown, schema: z.ZodType<T>) {
    const startedAt = Date.now();
    const operationId = randomUUID();
    try {
      const serializedInput = JSON.stringify({ operation, input });
      const request = buildOpenAiRequest(this.config, operation, serializedInput, schema);
      const requestOptions = {
        idempotencyKey: createHash("sha256")
          .update(`${this.config.model}:${serializedInput}`)
          .digest("hex"),
      };
      const completion = await this.client.chat.completions.create(request.body, requestOptions);
      const content = completion.choices[0]?.message.content;
      const resultModel = completion.model;
      const usage = extractOpenAiUsage(completion);
      if (!content) {
        throw new AiProviderError("structured_output_invalid", "AI output was empty.", operationId);
      }

      const parsedData = parseStructuredOutput(content, schema);
      const meta: ProviderRunMeta = {
        providerName: "openai",
        isMock: false,
        durationMs: Math.max(1, Date.now() - startedAt),
        ...usage,
        modelId: resultModel,
      };
      logOperation({
        operationId,
        operationType: operation,
        providerId: "openai",
        durationMs: meta.durationMs,
        success: true,
        environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
      });
      return { data: parsedData, meta };
    } catch (error) {
      logOperation({
        operationId,
        operationType: operation,
        providerId: "openai",
        durationMs: Math.max(1, Date.now() - startedAt),
        success: false,
        controlledErrorCode: classifyOpenAiError(error),
        environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
      });
      if (error instanceof AiProviderError) throw error;
      const code = classifyOpenAiError(error);
      throw new AiProviderError(
        code,
        safeOpenAiErrorMessage(code),
        operationId,
        getHttpStatus(error),
      );
    }
  }
}

const SYSTEM_INSTRUCTION =
  "Return only one valid JSON object matching the requested Marketra operation. Never invent sourced facts, companies, contacts, figures, or citations.";

export function buildOpenAiRequest<T>(
  config: OpenAiClientConfig,
  operation: string,
  serializedInput: string,
  schema: z.ZodType<T>,
) {
  getOpenAiModelDefinition(config.model);
  void operation;
  void schema;
  return {
    api: "chat_completions" as const,
    body: {
      model: config.model,
      messages: [
        { role: "system" as const, content: SYSTEM_INSTRUCTION },
        { role: "user" as const, content: serializedInput },
      ],
      response_format: { type: "json_object" as const },
      max_completion_tokens: config.maxOutputTokens ?? 800,
    },
  };
}

export function extractOpenAiUsage(
  result: ChatCompletion,
): Pick<
  ProviderRunMeta,
  | "tokens"
  | "inputTokens"
  | "outputTokens"
  | "reasoningTokens"
  | "cachedInputTokens"
  | "cacheWriteInputTokens"
> {
  const completion = result;
  return {
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
    tokens: completion.usage?.total_tokens,
    cachedInputTokens: completion.usage?.prompt_tokens_details?.cached_tokens,
    reasoningTokens: completion.usage?.completion_tokens_details?.reasoning_tokens,
  };
}

export function classifyOpenAiError(error: unknown): AiProviderErrorCode {
  if (error instanceof AiProviderError) return error.code;
  if (error instanceof OpenAI.APIConnectionTimeoutError) return "timeout";
  if (error instanceof OpenAI.APIError) {
    const providerCode = typeof error.code === "string" ? error.code : undefined;
    if (error.status === 401) return "invalid_api_key";
    if (error.status === 403) return "model_access_denied";
    if (error.status === 404) return "model_not_found";
    if (error.status === 429 && providerCode === "insufficient_quota") return "insufficient_quota";
    if (error.status === 429) return "rate_limited";
    if (error.status === 408) return "timeout";
    if (error.status === 400 || error.status === 422) return "invalid_request";
  }
  return "provider_unavailable";
}

function getHttpStatus(error: unknown): number | undefined {
  return error instanceof OpenAI.APIError ? error.status : undefined;
}

function safeOpenAiErrorMessage(code: AiProviderErrorCode): string {
  const messages: Record<AiProviderErrorCode, string> = {
    model_not_found: "The configured AI model is unavailable.",
    model_access_denied: "The configured AI model is not accessible.",
    invalid_api_key: "AI provider authentication failed.",
    insufficient_quota: "AI provider quota is unavailable.",
    rate_limited: "AI provider rate limit reached.",
    invalid_request: "The AI provider rejected the request.",
    timeout: "AI provider timed out.",
    structured_output_invalid: "AI output was invalid.",
    provider_unavailable: "AI provider is unavailable.",
  };
  return messages[code];
}

export function parseStructuredOutput<T>(content: string, schema: z.ZodType<T>): T {
  let decoded: unknown;
  try {
    decoded = JSON.parse(content);
  } catch {
    throw new AiProviderError("structured_output_invalid", "AI output was not valid JSON.");
  }
  const parsed = schema.safeParse(decoded);
  if (!parsed.success) {
    throw new AiProviderError(
      "structured_output_invalid",
      "AI output did not match the expected schema.",
    );
  }
  return parsed.data;
}
