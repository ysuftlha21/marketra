import { beforeEach, describe, expect, it, vi } from "vitest";
import { HunterClient, HunterProviderError } from "./hunter-client";

describe("HunterClient", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("adds credentials without exposing them in logs", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const client = new HunterClient({ apiKey: "hunter-secret", fetch: fetcher });
    await client.request("discover", "/discover");
    expect(String((fetcher.mock.calls[0] as unknown[] | undefined)?.[0])).toContain(
      "api_key=hunter-secret",
    );
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("hunter-secret");
  });

  it("retries rate limits using Retry-After", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "retry-after": "2" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const sleep = vi.fn(async () => undefined);
    await new HunterClient({ apiKey: "secret", fetch: fetcher, sleep, maxRetries: 2 }).request(
      "discover",
      "/discover",
    );
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("emits provider-neutral usage metadata for future credit metering", async () => {
    const onUsage = vi.fn();
    const client = new HunterClient({
      apiKey: "secret",
      fetch: async () => new Response(JSON.stringify({ data: [] }), { status: 200 }),
      onUsage,
    });
    await client.request("discover", "/discover");
    expect(onUsage).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "discover", attemptCount: 1, status: 200 }),
    );
  });

  it("treats Hunter's HTTP 403 rate limit as retryable", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    await new HunterClient({
      apiKey: "secret",
      fetch: fetcher,
      sleep: async () => undefined,
      maxRetries: 1,
    }).request("discover", "/discover");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("maps a safe 403 plan code without exposing the raw response", async () => {
    const client = new HunterClient({
      apiKey: "secret",
      fetch: async () =>
        new Response(
          JSON.stringify({
            errors: [{ id: "no_discover_access", details: "private provider detail" }],
          }),
          { status: 403 },
        ),
      maxRetries: 0,
    });
    await expect(client.request("discover", "/discover")).rejects.toMatchObject({
      category: "authorization",
      providerCode: "no_discover_access",
    });
  });

  it("maps authentication failures to a safe error", async () => {
    const client = new HunterClient({
      apiKey: "secret",
      fetch: async () => new Response("provider details", { status: 401 }),
      maxRetries: 0,
    });
    await expect(client.request("discover", "/discover")).rejects.toMatchObject({
      category: "authentication",
      status: 401,
    });
    await expect(client.request("discover", "/discover")).rejects.not.toThrow("provider details");
  });

  it("rejects invalid JSON as a controlled response error", async () => {
    const client = new HunterClient({
      apiKey: "secret",
      fetch: async () => new Response("not-json", { status: 200 }),
    });
    await expect(client.request("discover", "/discover")).rejects.toBeInstanceOf(
      HunterProviderError,
    );
  });
});
