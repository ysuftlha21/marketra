import OpenAI from "openai";
import type { Response as OpenAiResponse } from "openai/resources/responses/responses";
import type { ChatCompletion } from "openai/resources/chat/completions/completions";
import { zodTextFormat } from "openai/helpers/zod";
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

export class AiProviderError extends Error {
  constructor(
    readonly code: "timeout" | "rate_limited" | "invalid_output" | "provider_unavailable",
    message: string,
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
      let content: string | null | undefined;
      let resultModel: string;
      let usage: ReturnType<typeof extractOpenAiUsage>;
      if (request.api === "responses") {
        const response = await this.client.responses.create(request.body, requestOptions);
        content = response.output_text;
        resultModel = response.model;
        usage = extractOpenAiUsage("responses", response);
      } else {
        const completion = await this.client.chat.completions.create(request.body, requestOptions);
        content = completion.choices[0]?.message.content;
        resultModel = completion.model;
        usage = extractOpenAiUsage("chat_completions", completion);
      }
      if (!content) throw new AiProviderError("invalid_output", "AI output was empty.");

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
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          throw new AiProviderError("rate_limited", "AI provider rate limit reached.");
        }
        if (error.status === 408) {
          throw new AiProviderError("timeout", "AI provider timed out.");
        }
      }
      if (error instanceof OpenAI.APIConnectionTimeoutError) {
        throw new AiProviderError("timeout", "AI provider timed out.");
      }
      throw new AiProviderError("provider_unavailable", "AI provider is unavailable.");
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
  const model = getOpenAiModelDefinition(config.model);
  if (model.api === "responses") {
    return {
      api: "responses" as const,
      body: {
        model: config.model,
        instructions: SYSTEM_INSTRUCTION,
        input: serializedInput,
        max_output_tokens: config.maxOutputTokens ?? 800,
        reasoning: { effort: config.reasoningEffort ?? model.defaultReasoningEffort ?? "low" },
        text: {
          format: zodTextFormat(schema, operation.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64)),
          verbosity: "low" as const,
        },
      },
    };
  }
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
  api: "responses" | "chat_completions",
  result: OpenAiResponse | ChatCompletion,
): Pick<
  ProviderRunMeta,
  | "tokens"
  | "inputTokens"
  | "outputTokens"
  | "reasoningTokens"
  | "cachedInputTokens"
  | "cacheWriteInputTokens"
> {
  if (api === "responses") {
    const response = result as OpenAiResponse;
    return {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      tokens: response.usage?.total_tokens,
      cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens,
      cacheWriteInputTokens: response.usage?.input_tokens_details?.cache_write_tokens,
      reasoningTokens: response.usage?.output_tokens_details?.reasoning_tokens,
    };
  }
  const completion = result as ChatCompletion;
  return {
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
    tokens: completion.usage?.total_tokens,
    cachedInputTokens: completion.usage?.prompt_tokens_details?.cached_tokens,
    reasoningTokens: completion.usage?.completion_tokens_details?.reasoning_tokens,
  };
}

function classifyOpenAiError(error: unknown): string {
  if (error instanceof AiProviderError) return error.code;
  if (error instanceof OpenAI.APIConnectionTimeoutError) return "timeout";
  if (error instanceof OpenAI.APIError && error.status === 429) return "rate_limited";
  return "provider_unavailable";
}

export function parseStructuredOutput<T>(content: string, schema: z.ZodType<T>): T {
  let decoded: unknown;
  try {
    decoded = JSON.parse(content);
  } catch {
    throw new AiProviderError("invalid_output", "AI output was not valid JSON.");
  }
  const parsed = schema.safeParse(decoded);
  if (!parsed.success) {
    throw new AiProviderError("invalid_output", "AI output did not match the expected schema.");
  }
  return parsed.data;
}
