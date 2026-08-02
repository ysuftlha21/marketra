import { describe, expect, it } from "vitest";
import { AiProviderError } from "@/lib/providers/ai/openai-client";
import { icpErrorReference, mapIcpProviderError } from "./icp-generation-service";

describe("country ICP provider error mapping", () => {
  it.each([
    ["invalid_api_key", "provider_auth", "AI-PROVIDER-AUTH"],
    ["model_not_found", "provider_model", "AI-PROVIDER-MODEL"],
    ["model_access_denied", "provider_model", "AI-PROVIDER-MODEL"],
    ["insufficient_quota", "provider_quota", "AI-PROVIDER-QUOTA"],
    ["rate_limited", "provider_rate_limit", "AI-PROVIDER-RATE"],
    ["timeout", "provider_timeout", "AI-PROVIDER-TIMEOUT"],
    ["refusal", "invalid_provider_response", "AI-PROVIDER-OUTPUT"],
    ["truncated_output", "invalid_provider_response", "AI-PROVIDER-OUTPUT"],
    ["schema_version_mismatch", "invalid_provider_response", "AI-PROVIDER-OUTPUT"],
  ] as const)("maps %s without exposing raw messages", (providerCode, serviceCode, reference) => {
    const error = new AiProviderError(providerCode, "raw provider detail", "safe-operation");
    expect(mapIcpProviderError(error)).toBe(serviceCode);
    expect(icpErrorReference(serviceCode)).toBe(reference);
    expect(icpErrorReference(serviceCode)).not.toContain("raw provider detail");
  });

  it("does not mislabel persistence as a provider error", () => {
    expect(icpErrorReference("persistence_failure")).toBe("ICP-PERSIST");
  });
});
