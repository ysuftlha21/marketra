import { describe, expect, it } from "vitest";
import { InMemoryRateLimitProvider } from "./in-memory-rate-limit.provider";
import { createRateLimitProvider } from "./rate-limit.factory";

describe("RateLimitProvider", () => {
  it("enforces isolated deterministic buckets and retry-after", async () => {
    let now = 1_000;
    const provider = new InMemoryRateLimitProvider(() => now);
    const request = { key: "workspace:a:user:u:operation:x", limit: 1, windowMs: 1_000 };
    expect((await provider.consume(request)).allowed).toBe(true);
    const blocked = await provider.consume(request);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(
      (await provider.consume({ ...request, key: "workspace:b:user:u:operation:x" })).allowed,
    ).toBe(true);
    now += 1_000;
    expect((await provider.consume(request)).allowed).toBe(true);
  });
  it("fails safely for unknown providers", () => {
    expect(() => createRateLimitProvider("bogus")).toThrow(/Unknown rate-limit provider/);
  });
  it("supports check, reset, and expiry without consuming on check", async () => {
    let now = 1_000;
    const provider = new InMemoryRateLimitProvider(() => now);
    const request = { key: "test", limit: 1, windowMs: 1_000 };
    expect((await provider.check(request)).remaining).toBe(1);
    await provider.consume(request);
    expect((await provider.check(request)).allowed).toBe(false);
    await provider.reset("test");
    expect((await provider.check(request)).allowed).toBe(true);
    await provider.consume(request);
    now = 2_000;
    expect((await provider.check(request)).allowed).toBe(true);
  });
  it("does not allow parallel memory consumption past the limit", async () => {
    const provider = new InMemoryRateLimitProvider(() => 1_000);
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        provider.consume({ key: "parallel", limit: 7, windowMs: 1_000 }),
      ),
    );
    expect(results.filter((result) => result.allowed)).toHaveLength(7);
  });
});
