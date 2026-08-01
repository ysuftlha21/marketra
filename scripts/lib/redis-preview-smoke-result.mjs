export const SAFE_SMOKE_FIELDS = [
  "ok",
  "providerConfigured",
  "evalSupported",
  "atomicConsumePassed",
  "denialPassed",
  "ttlPassed",
  "remainingPassed",
  "cleanupPassed",
  "operationId",
];

const BOOLEAN_FIELDS = SAFE_SMOKE_FIELDS.slice(0, -1);

function errorCategory(status, parsed, validSchema) {
  if ([301, 302, 303, 307, 308].includes(status)) return "deployment_protection";
  if (status === 401) return "unauthorized";
  if (status === 404) return "endpoint_unavailable";
  if (status === 429) return "smoke_rate_limited";
  if (!parsed) return "non_json_response";
  if (!validSchema) return "unexpected_schema";
  if (status < 200 || status >= 300) return "http_error";
  return "smoke_assertion_failed";
}

export function classifyRedisPreviewSmokeResponse(status, payload, parsed = true) {
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const validSchema =
    BOOLEAN_FIELDS.every((field) => typeof record[field] === "boolean") &&
    typeof record.operationId === "string" &&
    record.operationId.length > 0;
  const assertionsPassed = validSchema && BOOLEAN_FIELDS.every((field) => record[field] === true);
  const success = status >= 200 && status < 300 && assertionsPassed;

  if (!success) {
    return {
      success: false,
      output: {
        httpStatus: status,
        errorCategory: errorCategory(status, parsed, validSchema),
      },
    };
  }

  return {
    success: true,
    output: {
      httpStatus: status,
      errorCategory: null,
      ...Object.fromEntries(SAFE_SMOKE_FIELDS.map((field) => [field, record[field]])),
    },
  };
}
