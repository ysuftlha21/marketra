import { afterEach, describe, expect, it, vi } from "vitest";
import { RedisRateLimitProvider } from "./redis-rate-limit.provider";

describe("RedisRateLimitProvider", () => {
  afterEach(() => vi.restoreAllMocks());
  const request = { key: "marketra:test:x:u:hash", limit: 2, windowMs: 60_000 };

  it("parses an atomic EVAL result", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ result: [1, 60000] }), { status: 200 }),
    );
    const provider = new RedisRateLimitProvider({
      url: "https://redis.example",
      token: "secret",
      timeoutMs: 100,
    });
    const result = await provider.consume(request);
    expect(result).toMatchObject({ allowed: true, remaining: 1, limit: 2 });
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body[0]).toBe("EVAL");
  });

  it.each([
    [401, "auth_failed"],
    [403, "auth_failed"],
    [400, "command_unsupported"],
    [500, "connectivity_failed"],
  ] as const)("fails closed for HTTP %s", async (status, reason) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status }));
    const provider = new RedisRateLimitProvider({
      url: "https://redis.example",
      token: "secret",
      timeoutMs: 100,
    });
    await expect(provider.consume(request)).rejects.toMatchObject({
      name: "RateLimitProviderUnavailableError",
      reason,
    });
  });

  it("rejects malformed Redis responses without exposing credentials", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ result: "bad" }), { status: 200 }),
    );
    const provider = new RedisRateLimitProvider({
      url: "https://redis.example",
      token: "secret",
      timeoutMs: 100,
    });
    await expect(provider.consume(request)).rejects.toMatchObject({
      name: "RateLimitProviderUnavailableError",
      reason: "response_invalid",
    });
  });

  it("fails closed when the REST request times out", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const provider = new RedisRateLimitProvider({
      url: "https://redis.example",
      token: "secret",
      timeoutMs: 1,
    });
    await expect(provider.consume(request)).rejects.toMatchObject({
      name: "RateLimitProviderUnavailableError",
      reason: "timeout",
    });
  });

  it("sends Upstash-compatible PING, EVAL, MGET, and DEL command arrays", async () => {
    const responses: unknown[] = ["PONG", [1, 60000], ["1"], 1];
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () =>
        Promise.resolve(
          new Response(JSON.stringify({ result: responses.shift() }), { status: 200 }),
        ),
      );
    const provider = new RedisRateLimitProvider({
      url: "https://redis.example",
      token: "secret",
      timeoutMs: 100,
    });
    await provider.diagnoseHealth();
    await provider.consume(request);
    await provider.getRemaining(request);
    await provider.reset(request.key);

    const commands = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    expect(commands[0]).toEqual(["PING"]);
    expect(commands[1]).toEqual([
      "EVAL",
      expect.stringContaining("INCR"),
      "1",
      request.key,
      String(request.limit),
      String(request.windowMs),
    ]);
    expect(commands[1][1]).toContain("PEXPIRE");
    expect(commands[1][1]).toContain("PTTL");
    expect(commands[2]).toEqual(["MGET", request.key]);
    expect(commands[3]).toEqual(["DEL", request.key]);
    expect(fetchMock.mock.calls.every((call) => call[1]?.headers)).toBe(true);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      authorization: "Bearer secret",
      "content-type": "application/json",
    });
  });

  it("uses atomic server-side counts under concurrent consumption", async () => {
    let count = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      count += 1;
      return new Response(JSON.stringify({ result: [count, 60000] }), { status: 200 });
    });
    const provider = new RedisRateLimitProvider({
      url: "https://redis.example",
      token: "secret",
      timeoutMs: 100,
    });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => provider.consume({ ...request, limit: 5 })),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed)).toHaveLength(5);
  });
});
