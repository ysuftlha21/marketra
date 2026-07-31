import type { BuyerDiscoveryProvider, BuyerDiscoveryProviderId } from "./buyer-discovery.provider";
import { MockBuyerDiscoveryProvider } from "./mock-buyer-discovery.provider";
import { HunterBuyerDiscoveryProvider } from "../hunter/hunter-buyer-discovery.provider";
import type { HunterClient } from "../hunter/hunter-client";

export function createBuyerDiscoveryProvider(
  id: BuyerDiscoveryProviderId,
  options?: { hunterClient?: HunterClient },
): BuyerDiscoveryProvider {
  if (id === "mock") return new MockBuyerDiscoveryProvider();
  if (!options?.hunterClient) throw new Error("Hunter buyer discovery is not configured.");
  return new HunterBuyerDiscoveryProvider(options.hunterClient);
}
