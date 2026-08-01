import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPreviewSmokeGuardsForTests } from "@/lib/security/preview-smoke-auth";

const mocks = vi.hoisted(() => ({
  enabled: vi.fn(),
  parseEnv: vi.fn(),
  createProvider: vi.fn(),
  runSmoke: vi.fn(),
}));

vi.mock("@/lib/env/env", () => ({
  isRedisPreviewSmokeEnabled: mocks.enabled,
  parseServerEnv: mocks.parseEnv,
}));
vi.mock("@/lib/providers/rate-limit/rate-limit.factory", () => ({
  createRateLimitProvider: mocks.createProvider,
}));
vi.mock("@/lib/providers/rate-limit/redis-rate-limit-smoke", () => ({
  runRedisRateLimitSmoke: mocks.runSmoke,
}));

import { POST } from "./route";

const token = "preview-smoke-token-with-at-least-32-characters";
const safeSuccess = {
  ok: true,
  providerConfigured: true,
  evalSupported: true,
  atomicConsumePassed: true,
  denialPassed: true,
  ttlPassed: true,
  remainingPassed: true,
  cleanupPassed: true,
  operationId: "123e4567-e89b-12d3-a456-426614174000",
};

function request(authorization?: string) {
  return new Request("https://preview.example/api/internal/redis-rate-limit-smoke", {
    method: "POST",
    headers: authorization ? { authorization } : undefined,
  });
}

describe("Preview Redis rate-limit smoke route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPreviewSmokeGuardsForTests();
    mocks.enabled.mockReturnValue(true);
    mocks.parseEnv.mockReturnValue({
      RATE_LIMIT_REDIS_SMOKE_TOKEN: token,
      RATE_LIMIT_REDIS_URL: "https://secret-redis.example",
      RATE_LIMIT_REDIS_TOKEN: "secret-redis-token",
      RATE_LIMIT_REQUEST_TIMEOUT_MS: 3_000,
    });
    mocks.createProvider.mockReturnValue({ id: "redis" });
    mocks.runSmoke.mockResolvedValue(safeSuccess);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("returns 404 outside Preview or when opt-in is disabled", async () => {
    mocks.enabled.mockReturnValue(false);
    const response = await POST(request(`Bearer ${token}`));
    expect(response.status).toBe(404);
    expect(mocks.parseEnv).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it.each([undefined, "Bearer invalid-token"])(
    "returns 401 for a missing or invalid Bearer token",
    async (authorization) => {
      const response = await POST(request(authorization));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ ok: false });
      expect(mocks.createProvider).not.toHaveBeenCalled();
    },
  );

  it("never accepts a smoke token from query parameters", async () => {
    const response = await POST(
      new Request(`https://preview.example/api/internal/redis-rate-limit-smoke?token=${token}`, {
        method: "POST",
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns only safe structured smoke fields for a valid token", async () => {
    const response = await POST(request(`Bearer ${token}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(safeSuccess);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.createProvider).toHaveBeenCalledWith("redis", {
      url: "https://secret-redis.example",
      token: "secret-redis-token",
      timeoutMs: 1_000,
    });
    expect(mocks.runSmoke).toHaveBeenCalledWith(expect.anything(), { namespace: undefined });
  });

  it("suppresses Redis configuration and failure details", async () => {
    mocks.createProvider.mockImplementation(() => {
      throw new Error("secret-redis-token https://secret-redis.example");
    });
    const response = await POST(request(`Bearer ${token}`));
    const body = JSON.stringify(await response.json());
    expect(response.status).toBe(503);
    expect(body).not.toContain("secret-redis-token");
    expect(body).not.toContain("secret-redis.example");
    expect(body).not.toContain(token);
    expect(body).toContain("configuration_unavailable");
    const safeLog = String(vi.mocked(console.warn).mock.calls.at(-1)?.[0]);
    expect(safeLog).toContain("configuration_unavailable");
    expect(safeLog).not.toContain("secret-redis-token");
    expect(safeLog).not.toContain("secret-redis.example");
    expect(safeLog).not.toContain(token);
  });

  it("returns safe failed assertions when EVAL is unavailable", async () => {
    mocks.runSmoke.mockResolvedValue({
      ...safeSuccess,
      ok: false,
      evalSupported: false,
      failureCategory: "redis_eval_failed",
    });
    const response = await POST(request(`Bearer ${token}`));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      evalSupported: false,
      failureCategory: "redis_eval_failed",
    });
  });

  it("categorizes an unexpected smoke exception without provider details", async () => {
    mocks.runSmoke.mockRejectedValue(new Error("secret-redis-token provider-host"));
    const response = await POST(request(`Bearer ${token}`));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      ok: false,
      providerConfigured: true,
      failureCategory: "smoke_internal_error",
    });
    expect(JSON.stringify(body)).not.toContain("provider-host");
  });
});
