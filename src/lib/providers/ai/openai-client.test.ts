import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { Response as OpenAiResponse } from "openai/resources/responses/responses";
import type { ChatCompletion } from "openai/resources/chat/completions/completions";
import {
  AiProviderError,
  buildOpenAiRequest,
  extractOpenAiUsage,
  parseStructuredOutput,
} from "./openai-client";

describe("OpenAI structured output validation", () => {
  const schema = z.object({ value: z.string().min(1) });
  it("accepts valid schema-conforming JSON", () => {
    expect(parseStructuredOutput('{"value":"ok"}', schema)).toEqual({ value: "ok" });
  });
  it("rejects malformed JSON safely", () => {
    expect(() => parseStructuredOutput("not-json", schema)).toThrow(AiProviderError);
  });
  it("rejects schema-invalid JSON safely", () => {
    expect(() => parseStructuredOutput('{"value":1}', schema)).toThrow(/expected schema/);
  });
});

describe("OpenAI request mapping", () => {
  const schema = z.object({ value: z.string() });

  it("maps GPT-5.6 Luna to Responses structured output", () => {
    const request = buildOpenAiRequest(
      {
        apiKey: "not-sent-by-builder",
        model: "gpt-5.6-luna",
        reasoningEffort: "low",
        timeoutMs: 30_000,
        maxRetries: 2,
        maxOutputTokens: 800,
      },
      "product_analysis_v2",
      '{"operation":"product_analysis_v2"}',
      schema,
    );
    expect(request).toMatchObject({
      api: "responses",
      body: {
        model: "gpt-5.6-luna",
        max_output_tokens: 800,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", strict: true }, verbosity: "low" },
      },
    });
    expect(JSON.stringify(request)).not.toContain("not-sent-by-builder");
  });

  it("keeps gpt-4o-mini on legacy Chat Completions without reasoning fields", () => {
    const request = buildOpenAiRequest(
      {
        apiKey: "not-sent-by-builder",
        model: "gpt-4o-mini",
        timeoutMs: 30_000,
        maxRetries: 2,
        maxOutputTokens: 800,
      },
      "product_analysis_v2",
      "{}",
      schema,
    );
    expect(request).toMatchObject({
      api: "chat_completions",
      body: {
        model: "gpt-4o-mini",
        max_completion_tokens: 800,
        response_format: { type: "json_object" },
      },
    });
    expect(request.body).not.toHaveProperty("reasoning");
    expect(request.body).not.toHaveProperty("reasoning_effort");
    expect(request.body).not.toHaveProperty("max_output_tokens");
  });

  it("extracts Responses reasoning and cached token usage", () => {
    const usage = extractOpenAiUsage("responses", {
      usage: {
        input_tokens: 100,
        output_tokens: 30,
        total_tokens: 130,
        input_tokens_details: { cached_tokens: 40, cache_write_tokens: 8 },
        output_tokens_details: { reasoning_tokens: 12 },
      },
    } as OpenAiResponse);
    expect(usage).toEqual({
      inputTokens: 100,
      outputTokens: 30,
      tokens: 130,
      cachedInputTokens: 40,
      cacheWriteInputTokens: 8,
      reasoningTokens: 12,
    });
  });

  it("extracts legacy Chat Completions usage", () => {
    const usage = extractOpenAiUsage("chat_completions", {
      usage: {
        prompt_tokens: 80,
        completion_tokens: 20,
        total_tokens: 100,
        prompt_tokens_details: { cached_tokens: 15 },
        completion_tokens_details: { reasoning_tokens: 0 },
      },
    } as ChatCompletion);
    expect(usage).toMatchObject({
      inputTokens: 80,
      outputTokens: 20,
      tokens: 100,
      cachedInputTokens: 15,
      reasoningTokens: 0,
    });
  });
});
