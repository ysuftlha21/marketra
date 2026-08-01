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
      output: { httpStatus: 200, errorCategory: "smoke_assertion_failed" },
    });
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
