import { describe, expect, it } from "vitest";
import { z } from "zod";
import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions/completions";
import {
  AiProviderError,
  buildOpenAiRequest,
  classifyOpenAiError,
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

  it("extracts legacy Chat Completions usage", () => {
    const usage = extractOpenAiUsage({
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

describe("OpenAI safe error classification", () => {
  function apiError(status: number, code?: string) {
    return OpenAI.APIError.generate(
      status,
      { error: { code, message: "provider detail that must never be returned" } },
      undefined,
      new Headers(),
    );
  }

  it.each([
    [apiError(401, "invalid_api_key"), "invalid_api_key"],
    [apiError(403), "model_access_denied"],
    [apiError(404, "model_not_found"), "model_not_found"],
    [apiError(429, "insufficient_quota"), "insufficient_quota"],
    [apiError(429, "rate_limit_exceeded"), "rate_limited"],
    [apiError(400), "invalid_request"],
  ])("maps provider failures without returning raw details", (error, expected) => {
    expect(classifyOpenAiError(error)).toBe(expected);
    expect(classifyOpenAiError(error)).not.toContain("provider detail");
  });

  it("maps bounded request timeouts", () => {
    expect(classifyOpenAiError(new OpenAI.APIConnectionTimeoutError())).toBe("timeout");
  });
});
