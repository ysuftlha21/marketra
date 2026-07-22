import { describe, it, expect } from "vitest";
import { createBillingProvider } from "./billing.factory";
import type { BillingProviderId } from "./billing.factory";

describe("createBillingProvider", () => {
  const unimplemented: BillingProviderId[] = ["stripe", "paytr", "iyzico"];
  it("creates a mock for 'mock'", () => {
    expect(createBillingProvider("mock").isMock).toBe(true);
  });
  it.each(unimplemented)("fails safely for unavailable '%s'", (id) => {
    expect(() => createBillingProvider(id)).toThrow(/is not available/);
  });
  it("createCheckoutSession returns a mock session with country price", async () => {
    const r = await createBillingProvider("mock").createCheckoutSession({
      planId: "growth",
      countryCode: "US",
      successUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
    });
    expect(r.data.isMock).toBe(true);
    expect(r.data.planId).toBe("growth");
    expect(r.data.currency).toBe("USD");
  });
});
