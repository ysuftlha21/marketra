import { expect, test } from "@playwright/test";

test.describe("server-side rate-limit denial", () => {
  test("denies across browser contexts with safe standard metadata", async ({
    request,
    playwright,
  }) => {
    test.skip(
      process.env.E2E_RATE_LIMIT_PROVIDER !== "memory",
      "Runs only in the isolated denial suite.",
    );

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const allowed = await request.get("/auth/callback", { maxRedirects: 0 });
      expect(allowed.headers().location).toContain("error=callback");
    }

    const secondContext = await playwright.request.newContext({
      baseURL: test.info().project.use.baseURL as string,
    });
    try {
      const denied = await secondContext.get("/auth/callback", { maxRedirects: 0 });
      expect(denied.headers().location).toContain("error=rate_limited");
      expect(denied.headers()["retry-after"]).toMatch(/^\d+$/);
      expect(denied.headers()["ratelimit-limit"]).toBe("30");
      expect(denied.headers()["ratelimit-remaining"]).toBe("0");
      expect(await denied.text()).not.toMatch(/redis|memory|127\.0\.0\.1|rate.?limit.?key/i);
    } finally {
      await secondContext.dispose();
    }
  });
});
