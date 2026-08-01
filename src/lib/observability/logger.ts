const REDACTED = "[REDACTED]";
const SENSITIVE_KEY =
  /api.?key|authorization|cookie|token|password|secret|signature|database.?url|session|prompt|message|cv/i;
const SAFE_USAGE_KEYS = new Set(["inputTokens", "outputTokens", "providerCalls"]);

export type OperationLog = {
  operationId: string;
  operation?: string;
  requestId?: string;
  operationType: string;
  workspaceId?: string;
  projectId?: string;
  providerId?: string;
  durationMs: number;
  success: boolean;
  controlledErrorCode?: string;
  providerErrorCode?: string;
  httpStatus?: number;
  environment: string;
  finishReason?: string;
  validationCategory?: string;
  invalidFields?: readonly string[];
  retryAttempted?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  providerCalls?: number;
};

export function redactLogValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactLogValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SENSITIVE_KEY.test(key) && !SAFE_USAGE_KEYS.has(key) ? REDACTED : redactLogValue(nested),
      ]),
    );
  }
  return value;
}

export function logOperation(event: OperationLog): void {
  const safe = redactLogValue(event) as Record<string, unknown>;
  const line = JSON.stringify({ event: "marketra.operation", ...safe });
  if (event.success) console.info(line);
  else console.error(line);
}
