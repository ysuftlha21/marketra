import { describe, expect, it } from "vitest";
import { checkHunterReadiness } from "@/lib/providers/hunter/hunter-readiness";

const enabled = process.env.HUNTER_SMOKE === "true";
describe.skipIf(!enabled)("Hunter opt-in smoke", () => {
  it("performs one read-only Discover request without database writes", async () => {
    const result = await checkHunterReadiness({ verifyDiscovery: true });
    console.info(
      JSON.stringify({
        success: result.discoveryAccessible,
        provider: "hunter",
        operation: "company_discovery_readiness",
        category: result.category ?? "ok",
        resultCount: result.resultCount ?? 0,
        httpStatusCategory: result.discoveryAccessible ? "2xx" : "controlled_error",
        operationId: result.operationId,
        persistenceAttempted: false,
        usageRecorded: false,
      }),
    );
    expect(result).toMatchObject({
      configured: true,
      authenticated: true,
      discoveryAccessible: true,
    });
  }, 30000);
});
