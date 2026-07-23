import OpenAI from "openai";
import { z } from "zod";
import type { ProviderRunMeta } from "../provider-types";
import { createHash, randomUUID } from "node:crypto";
import { logOperation } from "@/lib/observability/logger";

export interface OpenAiClientConfig {
  apiKey: string;
  model: string;
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
      const completion = await this.client.chat.completions.create(
        {
          model: this.config.model,
          messages: [
            {
              role: "system",
              content:
                "Return only one valid JSON object matching the requested Marketra operation. Never invent sourced facts, companies, contacts, figures, or citations.",
            },
            { role: "user", content: serializedInput },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: this.config.maxOutputTokens ?? 2000,
        },
        {
          idempotencyKey: createHash("sha256")
            .update(`${this.config.model}:${serializedInput}`)
            .digest("hex"),
        },
      );
      const content = completion.choices[0]?.message.content;
      if (!content) throw new AiProviderError("invalid_output", "AI output was empty.");

      const parsedData = parseStructuredOutput(content, schema);
      const inputTokens = completion.usage?.prompt_tokens;
      const outputTokens = completion.usage?.completion_tokens;
      const meta: ProviderRunMeta = {
        providerName: "openai",
        isMock: false,
        durationMs: Math.max(1, Date.now() - startedAt),
        inputTokens,
        outputTokens,
        tokens: completion.usage?.total_tokens,
        modelId: completion.model,
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
