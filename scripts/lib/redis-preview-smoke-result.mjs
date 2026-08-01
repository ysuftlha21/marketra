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

export const SAFE_FAILURE_CATEGORIES = [
  "configuration_unavailable",
  "redis_connectivity_failed",
  "redis_auth_failed",
  "redis_command_unsupported",
  "redis_eval_failed",
  "redis_response_invalid",
  "redis_timeout",
  "atomic_consume_failed",
  "ttl_validation_failed",
  "remaining_validation_failed",
  "cleanup_failed",
  "smoke_internal_error",
];

const BOOLEAN_FIELDS = SAFE_SMOKE_FIELDS.slice(0, -1);

function errorCategory(status, parsed, validSchema, providerCategory) {
  if ([301, 302, 303, 307, 308].includes(status)) return "deployment_protection";
  if (status === 401) return "unauthorized";
  if (status === 404) return "endpoint_unavailable";
  if (status === 429) return "smoke_rate_limited";
  if (!parsed) return "non_json_response";
  if (!validSchema) return "unexpected_schema";
  if (status === 503 && SAFE_FAILURE_CATEGORIES.includes(providerCategory)) {
    return providerCategory;
  }
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
        errorCategory: errorCategory(status, parsed, validSchema, record.failureCategory),
        ...(validSchema
          ? Object.fromEntries(SAFE_SMOKE_FIELDS.map((field) => [field, record[field]]))
          : {}),
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
