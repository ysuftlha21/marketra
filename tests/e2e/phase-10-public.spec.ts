import { expect, test } from "@playwright/test";

test.describe("Phase 10 public launch surfaces", () => {
  test("exposes safe health responses without infrastructure details", async ({ request }) => {
    const live = await request.get("/api/health/live");
    expect(live.status()).toBe(200);
    expect(await live.json()).toMatchObject({ status: "ok" });
    expect(live.headers()["cache-control"]).toContain("no-store");

    const ready = await request.get("/api/health/ready");
    expect([200, 503]).toContain(ready.status());
    const body = (await ready.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["status", "timestamp", "version"]);
    expect(JSON.stringify(body)).not.toMatch(/key|database|table|supabase/i);
  });

  test("makes legal and trust information reachable with semantic headings", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms of Service" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Refund Policy" })).toBeVisible();

    for (const [path, heading] of [
      ["/privacy", "Privacy Policy"],
      ["/terms", "Terms of Service"],
      ["/refund", "Refund Policy"],
      ["/cookies", "Cookie and Tracking Disclosure"],
      ["/ai-disclosure", "AI and Demo Data Disclosure"],
      ["/data-deletion", "Data Deletion and Account Requests"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(
        page.getByRole("banner").getByRole("link", { name: "Marketra home" }),
      ).toBeVisible();
    }
  });
});
