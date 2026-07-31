import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env/env";
import { createHunterClient } from "@/lib/providers/hunter/hunter-config";

const enabled = process.env.HUNTER_SMOKE === "true";
describe.skipIf(!enabled)("Hunter opt-in smoke", () => {
  it("performs one read-only Discover request without database writes", async () => {
    const env = parseServerEnv();
    const response = await createHunterClient(env).request<unknown>(
      "hunter_smoke_discover",
      "/discover",
      {
        method: "POST",
        body: { query: process.env.HUNTER_SMOKE_QUERY ?? "SaaS companies in Germany" },
      },
    );
    expect(response).toBeTruthy();
  }, 30000);
});
