import { describe, expect, it } from "vitest";
import { classifyRedisPreviewSmokeResponse } from "../../scripts/lib/redis-preview-smoke-result.mjs";

const successPayload = {
  ok: true,
  providerConfigured: true,
  evalSupported: true,
  atomicConsumePassed: true,
  denialPassed: true,
  ttlPassed: true,
  remainingPassed: true,
  cleanupPassed: true,
  operationId: "safe-operation-id",
};

describe("Redis Preview smoke operator response handling", () => {
  it.each([
    [404, {}, true, "endpoint_unavailable"],
    [401, {}, true, "unauthorized"],
    [302, {}, false, "deployment_protection"],
    [500, {}, false, "non_json_response"],
    [200, {}, true, "unexpected_schema"],
  ] as const)("fails safely for HTTP %s", (status, payload, parsed, category) => {
    expect(classifyRedisPreviewSmokeResponse(status, payload, parsed)).toEqual({
      success: false,
      output: { httpStatus: status, errorCategory: category },
    });
  });

  it("fails when any expected assertion is false", () => {
    expect(
      classifyRedisPreviewSmokeResponse(200, { ...successPayload, cleanupPassed: false }),
    ).toEqual({
      success: false,
      output: {
        httpStatus: 200,
        errorCategory: "smoke_assertion_failed",
        ...successPayload,
        cleanupPassed: false,
      },
    });
  });

  it("renders only an allowlisted provider failure category and safe result fields", () => {
    const result = classifyRedisPreviewSmokeResponse(503, {
      ...successPayload,
      ok: false,
      evalSupported: false,
      cleanupPassed: true,
      failureCategory: "redis_eval_failed",
      raw: "provider host and secret must not appear",
    });
    expect(result).toEqual({
      success: false,
      output: {
        httpStatus: 503,
        errorCategory: "redis_eval_failed",
        ...successPayload,
        ok: false,
        evalSupported: false,
        cleanupPassed: true,
      },
    });
    expect(JSON.stringify(result)).not.toContain("provider host and secret");
  });

  it("rejects a provider-supplied category outside the allowlist", () => {
    expect(
      classifyRedisPreviewSmokeResponse(503, {
        ...successPayload,
        ok: false,
        failureCategory: "secret-provider-message",
      }).output,
    ).toMatchObject({ errorCategory: "http_error" });
  });

  it("prints only allowlisted safe fields on success", () => {
    const result = classifyRedisPreviewSmokeResponse(200, {
      ...successPayload,
      token: "must-not-appear",
      url: "must-not-appear",
      raw: "must-not-appear",
    });
    expect(result.success).toBe(true);
    expect(result.output).toEqual({
      httpStatus: 200,
      errorCategory: null,
      ...successPayload,
    });
    expect(JSON.stringify(result.output)).not.toContain("must-not-appear");
  });
});
