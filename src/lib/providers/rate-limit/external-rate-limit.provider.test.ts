import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalRateLimitProvider } from "./external-rate-limit.provider";

const request = { key: "workspace:user:outreach", limit: 2, windowMs: 60_000 };

describe("ExternalRateLimitProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the validated durable-provider result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ allowed: false, remaining: 0, retryAfterSeconds: 30 }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      new ExternalRateLimitProvider({
        url: "https://limiter.example.test/consume",
        token: "provider-secret",
        timeoutMs: 100,
      }).consume(request),
    ).resolves.toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 30 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("retries once and exposes only a controlled unavailable error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Authorization: provider-secret"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      new ExternalRateLimitProvider({
        url: "https://limiter.example.test/consume",
        token: "provider-secret",
        timeoutMs: 100,
      }).consume(request),
    ).rejects.toMatchObject({
      name: "RateLimitProviderUnavailableError",
      message: "Request protection is temporarily unavailable.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed provider responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ allowed: "yes" }), { status: 200 })),
    );
    await expect(
      new ExternalRateLimitProvider({
        url: "https://limiter.example.test/consume",
        token: "provider-secret",
        timeoutMs: 100,
      }).consume(request),
    ).rejects.toMatchObject({ name: "RateLimitProviderUnavailableError" });
  });
});
