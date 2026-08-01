import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions/completions";
import {
  StructuredOpenAiClient,
  buildOpenAiRequest,
  classifyOpenAiError,
  extractOpenAiUsage,
  parseStructuredOutput,
  validateStructuredOutput,
} from "./openai-client";
import { v2ProductAnalysisResultSchema } from "./ai.provider";

const schema = z
  .object({
    schemaVersion: z.literal("v2"),
    value: z.string(),
    confidence: z.enum(["low", "medium", "high"]),
  })
  .strict();

function completionResponse(input: {
  content?: string | null;
  finishReason?: string;
  refusal?: string | null;
  choices?: unknown[];
  status?: number;
  errorCode?: string;
}) {
  if (input.status && input.status >= 400) {
    return new Response(
      JSON.stringify({ error: { code: input.errorCode, message: "raw provider detail" } }),
      { status: input.status, headers: { "content-type": "application/json" } },
    );
  }
  return new Response(
    JSON.stringify({
      id: "safe-completion-id",
      object: "chat.completion",
      created: 1,
      model: "gpt-4o-mini",
      choices: input.choices ?? [
        {
          index: 0,
          finish_reason: input.finishReason ?? "stop",
          message: {
            role: "assistant",
            content: input.content ?? null,
            refusal: input.refusal ?? null,
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function client(fetchMock: typeof fetch) {
  return new StructuredOpenAiClient({
    apiKey: "secret-test-key",
    model: "gpt-4o-mini",
    timeoutMs: 1_000,
    maxRetries: 0,
    maxOutputTokens: 800,
    fetch: fetchMock,
  });
}

describe("OpenAI strict structured output", () => {
  it("uses strict json_schema mode and a product-analysis-specific budget", () => {
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
      v2ProductAnalysisResultSchema,
    );
    expect(request).toMatchObject({
      api: "chat_completions",
      body: {
        model: "gpt-4o-mini",
        max_completion_tokens: 1_200,
        response_format: {
          type: "json_schema",
          json_schema: { strict: true, name: "product_analysis_v2" },
        },
      },
    });
    const format = request.body.response_format;
    expect(format.json_schema.schema).toMatchObject({ additionalProperties: false });
    expect(request.body).not.toHaveProperty("reasoning");
    expect(JSON.stringify(request)).not.toContain("not-sent-by-builder");
  });

  it("accepts valid schema-conforming JSON", () => {
    expect(
      parseStructuredOutput('{"schemaVersion":"v2","value":"ok","confidence":"high"}', schema),
    ).toEqual({ schemaVersion: "v2", value: "ok", confidence: "high" });
  });

  it.each([
    ["not-json", "invalid_json", []],
    ['```json\n{"schemaVersion":"v2"}\n```', "markdown_wrapped_json", []],
    ['{"schemaVersion":"v2","confidence":"high"}', "missing_required_field", ["value"]],
    ['{"schemaVersion":"v2","value":[],"confidence":"high"}', "wrong_field_type", ["value"]],
    [
      '{"schemaVersion":"v2","value":"ok","confidence":"certain"}',
      "unexpected_enum_value",
      ["confidence"],
    ],
    [
      '{"schemaVersion":"v1","value":"ok","confidence":"high"}',
      "schema_version_mismatch",
      ["schemaVersion"],
    ],
  ])("classifies invalid output without content leakage", (content, category, fields) => {
    const result = validateStructuredOutput(content, schema);
    expect(result).toMatchObject({ ok: false, category, invalidFieldPaths: fields });
    expect(JSON.stringify(result)).not.toContain("secret-test-key");
  });
});

describe("OpenAI response states and repair", () => {
  it.each([
    [completionResponse({ content: "", finishReason: "stop" }), "empty_completion"],
    [completionResponse({ content: null, refusal: "declined" }), "refusal"],
    [completionResponse({ content: "{}", finishReason: "length" }), "truncated_output"],
    [completionResponse({ choices: [] }), "provider_response_extraction_failed"],
  ])("maps incomplete provider states", async (response, code) => {
    const fetchMock = vi.fn().mockResolvedValue(response);
    await expect(client(fetchMock).generate("test_operation", {}, schema)).rejects.toMatchObject({
      code,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("repairs syntactically valid schema-invalid JSON once and aggregates both calls", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        completionResponse({ content: '{"schemaVersion":"v2","confidence":"high"}' }),
      )
      .mockResolvedValueOnce(
        completionResponse({
          content: '{"schemaVersion":"v2","value":"fixed","confidence":"high"}',
        }),
      );
    const result = await client(fetchMock).generate("test_operation", {}, schema);
    expect(result.data).toEqual({ schemaVersion: "v2", value: "fixed", confidence: "high" });
    expect(result.meta).toMatchObject({
      retryAttempted: true,
      providerCalls: 2,
      inputTokens: 20,
      outputTokens: 40,
      tokens: 60,
    });
    expect(result.meta.attempts).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops after one unsuccessful repair", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        completionResponse({ content: '{"schemaVersion":"v2","confidence":"high"}' }),
      )
      .mockResolvedValueOnce(
        completionResponse({ content: '{"schemaVersion":"v2","confidence":"high"}' }),
      );
    await expect(client(fetchMock).generate("test_operation", {}, schema)).rejects.toMatchObject({
      code: "missing_required_field",
      diagnostics: { retryAttempted: true, invalidFieldPaths: ["value"] },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [completionResponse({ status: 401, errorCode: "invalid_api_key" }), "invalid_api_key"],
    [completionResponse({ status: 429, errorCode: "insufficient_quota" }), "insufficient_quota"],
    [completionResponse({ status: 429, errorCode: "rate_limit_exceeded" }), "rate_limited"],
    [completionResponse({ content: null, refusal: "declined" }), "refusal"],
  ])("does not repair non-repairable failures", async (response, code) => {
    const fetchMock = vi.fn().mockResolvedValue(response);
    await expect(client(fetchMock).generate("test_operation", {}, schema)).rejects.toMatchObject({
      code,
      diagnostics: { retryAttempted: false },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("OpenAI usage and safe API error mapping", () => {
  it("extracts Chat Completions usage", () => {
    const usage = extractOpenAiUsage({
      usage: { prompt_tokens: 80, completion_tokens: 20, total_tokens: 100 },
    } as ChatCompletion);
    expect(usage).toEqual({ inputTokens: 80, outputTokens: 20, tokens: 100 });
  });

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
    [apiError(404), "model_not_found"],
    [apiError(429, "insufficient_quota"), "insufficient_quota"],
    [apiError(429, "rate_limit_exceeded"), "rate_limited"],
    [apiError(400), "invalid_request"],
  ])("maps provider failures without raw details", (error, expected) => {
    expect(classifyOpenAiError(error)).toBe(expected);
    expect(classifyOpenAiError(error)).not.toContain("provider detail");
  });

  it("maps bounded request timeouts", () => {
    expect(classifyOpenAiError(new OpenAI.APIConnectionTimeoutError())).toBe("timeout");
  });
});
