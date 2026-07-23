import { describe, expect, it, vi } from "vitest";
import { checkReadiness } from "./readiness-service";

describe("readiness service", () => {
  it("fails safely without required public Supabase configuration", async () => {
    await expect(checkReadiness({}, vi.fn())).resolves.toEqual({ ready: false });
  });
  it("reports only bounded dependency availability", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    await expect(
      checkReadiness(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "public",
        },
        fetcher,
      ),
    ).resolves.toEqual({ ready: true });
    expect(fetcher).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/health",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });
  it("does not expose dependency errors", async () => {
    await expect(
      checkReadiness(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "public",
        },
        vi.fn().mockRejectedValue(new Error("database details")),
      ),
    ).resolves.toEqual({ ready: false });
  });
});
