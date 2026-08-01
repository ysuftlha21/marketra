import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions/completions";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { ProviderAttemptMeta, ProviderRunMeta } from "../provider-types";
import { createHash, randomUUID } from "node:crypto";
import { logOperation } from "@/lib/observability/logger";
import {
  getOpenAiModelDefinition,
  type OpenAiModelId,
  type OpenAiReasoningEffort,
} from "@/config/openai-models";
import { resolveOpenAiOutputTokenBudget } from "./openai-task-config";

export interface OpenAiClientConfig {
  apiKey: string;
  model: OpenAiModelId;
  reasoningEffort?: OpenAiReasoningEffort;
  timeoutMs: number;
  maxRetries: number;
  maxOutputTokens?: number;
  fetch?: typeof fetch;
}

export type OutputValidationCategory =
  | "empty_completion"
  | "refusal"
  | "truncated_output"
  | "invalid_json"
  | "markdown_wrapped_json"
  | "missing_required_field"
  | "wrong_field_type"
  | "unexpected_enum_value"
  | "extra_unsupported_structure"
  | "schema_version_mismatch"
  | "provider_response_extraction_failed";

export type AiProviderErrorCode =
  | "model_not_found"
  | "model_access_denied"
  | "invalid_api_key"
  | "insufficient_quota"
  | "rate_limited"
  | "invalid_request"
  | "timeout"
  | "structured_output_invalid"
  | OutputValidationCategory
  | "provider_unavailable";

export interface AiProviderErrorDiagnostics {
  readonly finishReason?: string;
  readonly invalidFieldPaths?: readonly string[];
  readonly retryAttempted?: boolean;
  readonly attempts?: readonly ProviderAttemptMeta[];
}

export class AiProviderError extends Error {
  constructor(
    readonly code: AiProviderErrorCode,
    message: string,
    readonly operationId: string = randomUUID(),
    readonly httpStatus?: number,
    readonly diagnostics: AiProviderErrorDiagnostics = {},
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

interface ValidationSuccess<T> {
  ok: true;
  data: T;
}

interface ValidationFailure {
  ok: false;
  category: OutputValidationCategory;
  invalidFieldPaths: string[];
  decoded?: unknown;
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export class StructuredOpenAiClient {
  private readonly client: OpenAI;

  constructor(private readonly config: OpenAiClientConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs,
      maxRetries: Math.min(config.maxRetries, 2),
      fetch: config.fetch,
      dangerouslyAllowBrowser: Boolean(config.fetch),
    });
  }

  async generate<T>(operation: string, input: unknown, schema: z.ZodType<T>) {
    const startedAt = Date.now();
    const operationId = randomUUID();
    const serializedInput = JSON.stringify({ operation, input });
    const outputBudget = resolveOpenAiOutputTokenBudget(
      operation,
      this.config.maxOutputTokens ?? 800,
    );
    const request = buildOpenAiRequest(
      this.config,
      operation,
      serializedInput,
      schema,
      outputBudget,
    );
    const requestOptions = {
      idempotencyKey: createHash("sha256")
        .update(`${this.config.model}:${serializedInput}`)
        .digest("hex"),
    };
    const attempts: ProviderAttemptMeta[] = [];
    let retryAttempted = false;

    try {
      const first = await this.complete(request.body, requestOptions, operationId, attempts);
      let validation = validateStructuredOutput(first.content, schema);

      if (!validation.ok && isRepairable(validation.category)) {
        retryAttempted = true;
        const repairBody = buildRepairRequest(
          this.config,
          operation,
          schema,
          outputBudget,
          validation,
        );
        const repaired = await this.complete(repairBody, requestOptions, operationId, attempts);
        validation = validateStructuredOutput(repaired.content, schema);
      }

      if (!validation.ok) {
        throw outputError(operationId, validation, attempts, retryAttempted);
      }

      const lastAttempt = attempts.at(-1);
      const usage = aggregateAttemptUsage(attempts);
      const meta: ProviderRunMeta = {
        providerName: "openai",
        isMock: false,
        durationMs: Math.max(1, Date.now() - startedAt),
        ...usage,
        modelId: lastAttempt?.modelId ?? this.config.model,
        finishReason: lastAttempt?.finishReason,
        retryAttempted,
        providerCalls: attempts.length,
        operationId,
        attempts,
      };
      logOpenAiOperation({
        operationId,
        operation,
        durationMs: meta.durationMs,
        success: true,
        finishReason: meta.finishReason,
        retryAttempted,
        providerCalls: attempts.length,
        inputTokens: meta.inputTokens,
        outputTokens: meta.outputTokens,
      });
      return { data: validation.data, meta };
    } catch (error) {
      const normalized = normalizeProviderError(error, operationId, attempts, retryAttempted);
      logOpenAiOperation({
        operationId,
        operation,
        durationMs: Math.max(1, Date.now() - startedAt),
        success: false,
        controlledErrorCode: normalized.code,
        finishReason: normalized.diagnostics.finishReason,
        validationCategory: isOutputCategory(normalized.code) ? normalized.code : undefined,
        invalidFields: normalized.diagnostics.invalidFieldPaths,
        retryAttempted: normalized.diagnostics.retryAttempted,
        providerCalls: normalized.diagnostics.attempts?.length,
        inputTokens: sumAttemptField(normalized.diagnostics.attempts, "inputTokens"),
        outputTokens: sumAttemptField(normalized.diagnostics.attempts, "outputTokens"),
      });
      throw normalized;
    }
  }

  private async complete<T>(
    body: ReturnType<typeof buildOpenAiRequest<T>>["body"],
    requestOptions: { idempotencyKey: string },
    operationId: string,
    attempts: ProviderAttemptMeta[],
  ): Promise<{ content: string }> {
    const attemptStartedAt = Date.now();
    const completion = await this.client.chat.completions.create(body, requestOptions);
    const choice = completion.choices[0];
    const usage = extractOpenAiUsage(completion);
    const baseAttempt = {
      durationMs: Math.max(1, Date.now() - attemptStartedAt),
      ...usage,
      modelId: completion.model,
      finishReason: choice?.finish_reason,
    };

    if (!choice) {
      attempts.push({
        ...baseAttempt,
        success: false,
        controlledErrorCode: "provider_response_extraction_failed",
      });
      throw new AiProviderError(
        "provider_response_extraction_failed",
        "AI provider response was incomplete.",
        operationId,
        undefined,
        { attempts },
      );
    }
    if (choice.finish_reason === "length") {
      attempts.push({ ...baseAttempt, success: false, controlledErrorCode: "truncated_output" });
      throw new AiProviderError(
        "truncated_output",
        "AI output was incomplete.",
        operationId,
        undefined,
        {
          finishReason: choice.finish_reason,
          attempts,
        },
      );
    }
    if (choice.message.refusal) {
      attempts.push({ ...baseAttempt, success: false, controlledErrorCode: "refusal" });
      throw new AiProviderError(
        "refusal",
        "AI provider declined the request.",
        operationId,
        undefined,
        {
          finishReason: choice.finish_reason,
          attempts,
        },
      );
    }
    if (typeof choice.message.content !== "string") {
      const code =
        choice.message.content === null
          ? "empty_completion"
          : "provider_response_extraction_failed";
      attempts.push({ ...baseAttempt, success: false, controlledErrorCode: code });
      throw new AiProviderError(code, "AI output was unavailable.", operationId, undefined, {
        finishReason: choice.finish_reason,
        attempts,
      });
    }
    if (!choice.message.content.trim()) {
      attempts.push({ ...baseAttempt, success: false, controlledErrorCode: "empty_completion" });
      throw new AiProviderError(
        "empty_completion",
        "AI output was empty.",
        operationId,
        undefined,
        {
          finishReason: choice.finish_reason,
          attempts,
        },
      );
    }
    attempts.push({ ...baseAttempt, success: true });
    return { content: choice.message.content };
  }
}

const SYSTEM_INSTRUCTION =
  "Return concise structured data matching the supplied schema. Never invent sourced facts, companies, contacts, figures, or citations.";

export function buildOpenAiRequest<T>(
  config: OpenAiClientConfig,
  operation: string,
  serializedInput: string,
  schema: z.ZodType<T>,
  outputBudget = resolveOpenAiOutputTokenBudget(operation, config.maxOutputTokens ?? 800),
) {
  getOpenAiModelDefinition(config.model);
  return {
    api: "chat_completions" as const,
    body: {
      model: config.model,
      messages: [
        { role: "system" as const, content: SYSTEM_INSTRUCTION },
        { role: "user" as const, content: serializedInput },
      ],
      response_format: zodResponseFormat(schema, safeSchemaName(operation)),
      max_completion_tokens: outputBudget,
    },
  };
}

function buildRepairRequest<T>(
  config: OpenAiClientConfig,
  operation: string,
  schema: z.ZodType<T>,
  outputBudget: number,
  failure: ValidationFailure,
): ReturnType<typeof buildOpenAiRequest<T>>["body"] {
  return {
    model: config.model,
    messages: [
      { role: "system" as const, content: SYSTEM_INSTRUCTION },
      {
        role: "user" as const,
        content: JSON.stringify({
          task: "Repair this JSON to satisfy the canonical schema.",
          invalidFieldPaths: failure.invalidFieldPaths,
          requirements: "Return only the complete schema-conforming JSON object.",
          invalidJson: failure.decoded,
        }),
      },
    ],
    response_format: zodResponseFormat(schema, safeSchemaName(`${operation}_repair`)),
    max_completion_tokens: outputBudget,
  };
}

export function validateStructuredOutput<T>(
  content: string,
  schema: z.ZodType<T>,
): ValidationResult<T> {
  if (/^\s*```/.test(content)) {
    return { ok: false, category: "markdown_wrapped_json", invalidFieldPaths: [] };
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(content);
  } catch {
    return { ok: false, category: "invalid_json", invalidFieldPaths: [] };
  }
  const parsed = schema.safeParse(decoded);
  if (parsed.success) return { ok: true, data: parsed.data };
  const invalidFieldPaths = [...new Set(parsed.error.issues.map(issuePath))].slice(0, 20);
  return {
    ok: false,
    category: classifyValidationIssues(parsed.error.issues),
    invalidFieldPaths,
    decoded,
  };
}

export function parseStructuredOutput<T>(content: string, schema: z.ZodType<T>): T {
  const result = validateStructuredOutput(content, schema);
  if (result.ok) return result.data;
  throw outputError(randomUUID(), result, [], false);
}

export function extractOpenAiUsage(
  completion: ChatCompletion,
): Pick<ProviderAttemptMeta, "tokens" | "inputTokens" | "outputTokens"> {
  return {
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
    tokens: completion.usage?.total_tokens,
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

function normalizeProviderError(
  error: unknown,
  operationId: string,
  attempts: ProviderAttemptMeta[],
  retryAttempted: boolean,
): AiProviderError {
  if (error instanceof AiProviderError) {
    return new AiProviderError(error.code, error.message, operationId, error.httpStatus, {
      ...error.diagnostics,
      retryAttempted,
      attempts: error.diagnostics.attempts ?? attempts,
    });
  }
  const code = classifyOpenAiError(error);
  return new AiProviderError(
    code,
    safeOpenAiErrorMessage(code),
    operationId,
    getHttpStatus(error),
    {
      retryAttempted,
      attempts,
    },
  );
}

function outputError(
  operationId: string,
  failure: ValidationFailure,
  attempts: ProviderAttemptMeta[],
  retryAttempted: boolean,
): AiProviderError {
  return new AiProviderError(
    failure.category,
    "AI output did not match the expected structure.",
    operationId,
    undefined,
    {
      finishReason: attempts.at(-1)?.finishReason,
      invalidFieldPaths: failure.invalidFieldPaths,
      retryAttempted,
      attempts,
    },
  );
}

function classifyValidationIssues(issues: z.core.$ZodIssue[]): OutputValidationCategory {
  if (issues.some((issue) => issue.path.join(".") === "schemaVersion")) {
    return "schema_version_mismatch";
  }
  if (issues.some((issue) => issue.code === "unrecognized_keys")) {
    return "extra_unsupported_structure";
  }
  if (issues.some((issue) => issue.code === "invalid_value")) {
    return "unexpected_enum_value";
  }
  if (
    issues.some((issue) => issue.code === "invalid_type" && issue.message.includes("undefined"))
  ) {
    return "missing_required_field";
  }
  return "wrong_field_type";
}

function issuePath(issue: z.core.$ZodIssue): string {
  return issue.path.length ? issue.path.map(String).join(".") : "$";
}

function isRepairable(category: OutputValidationCategory): boolean {
  return [
    "missing_required_field",
    "wrong_field_type",
    "unexpected_enum_value",
    "extra_unsupported_structure",
    "schema_version_mismatch",
  ].includes(category);
}

function isOutputCategory(code: AiProviderErrorCode): code is OutputValidationCategory {
  return [
    "empty_completion",
    "refusal",
    "truncated_output",
    "invalid_json",
    "markdown_wrapped_json",
    "missing_required_field",
    "wrong_field_type",
    "unexpected_enum_value",
    "extra_unsupported_structure",
    "schema_version_mismatch",
    "provider_response_extraction_failed",
  ].includes(code);
}

function aggregateAttemptUsage(attempts: readonly ProviderAttemptMeta[]) {
  return {
    inputTokens: sumAttemptField(attempts, "inputTokens"),
    outputTokens: sumAttemptField(attempts, "outputTokens"),
    tokens: sumAttemptField(attempts, "tokens"),
  };
}

function sumAttemptField(
  attempts: readonly ProviderAttemptMeta[] | undefined,
  field: "inputTokens" | "outputTokens" | "tokens",
): number | undefined {
  if (!attempts?.some((attempt) => attempt[field] !== undefined)) return undefined;
  return attempts.reduce((total, attempt) => total + (attempt[field] ?? 0), 0);
}

function safeSchemaName(operation: string): string {
  return operation.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

function getHttpStatus(error: unknown): number | undefined {
  return error instanceof OpenAI.APIError ? error.status : undefined;
}

function safeOpenAiErrorMessage(code: AiProviderErrorCode): string {
  if (isOutputCategory(code) || code === "structured_output_invalid")
    return "AI output was invalid.";
  const messages: Partial<Record<AiProviderErrorCode, string>> = {
    model_not_found: "The configured AI model is unavailable.",
    model_access_denied: "The configured AI model is not accessible.",
    invalid_api_key: "AI provider authentication failed.",
    insufficient_quota: "AI provider quota is unavailable.",
    rate_limited: "AI provider rate limit reached.",
    invalid_request: "The AI provider rejected the request.",
    timeout: "AI provider timed out.",
    provider_unavailable: "AI provider is unavailable.",
  };
  return messages[code] ?? "AI provider is unavailable.";
}

function logOpenAiOperation(
  input: Omit<
    Parameters<typeof logOperation>[0],
    "providerId" | "environment" | "operationType"
  > & { operation: string },
) {
  const { operation, ...event } = input;
  logOperation({
    ...event,
    operationType: operation,
    providerId: "openai",
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
  });
}
