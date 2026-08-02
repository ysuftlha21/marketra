import { parseServerEnv } from "@/lib/env/env";
import { randomUUID } from "node:crypto";
import { createHunterClient } from "./hunter-config";
import { HunterCompanyDiscoveryProvider } from "./hunter-company-discovery.provider";
import { HunterProviderError, type HunterErrorCategory } from "./hunter-client";

export function getHunterReadiness(): { configured: boolean; enabled: boolean; message: string } {
  const env = parseServerEnv();
  const configured = Boolean(env.HUNTER_API_KEY && env.HUNTER_BASE_URL.startsWith("https://"));
  return {
    configured,
    enabled: env.HUNTER_DISCOVERY_UI_ENABLED,
    message: !configured
      ? "Hunter credentials are not configured."
      : env.HUNTER_DISCOVERY_UI_ENABLED
        ? "Hunter UI activation is ready."
        : "Hunter is configured but UI activation remains disabled.",
  };
}

export type HunterReadinessCategory =
  | "not_configured"
  | "authentication_failed"
  | "permission_denied"
  | "plan_restricted"
  | "rate_limited"
  | "timeout"
  | "connectivity_failed"
  | "invalid_response"
  | "provider_unavailable";

export interface HunterOperatorReadiness {
  configured: boolean;
  authenticated: boolean;
  discoveryAccessible: boolean;
  category?: HunterReadinessCategory;
  operationId: string;
  resultCount?: number;
}

function readinessCategory(category: HunterErrorCategory): HunterReadinessCategory {
  const categories: Record<HunterErrorCategory, HunterReadinessCategory> = {
    authentication: "authentication_failed",
    permission_denied: "permission_denied",
    plan_restricted: "plan_restricted",
    rate_limit: "rate_limited",
    not_found: "invalid_response",
    invalid_request: "invalid_response",
    timeout: "timeout",
    connectivity: "connectivity_failed",
    invalid_response: "invalid_response",
    provider_unavailable: "provider_unavailable",
  };
  return categories[category];
}

export async function checkHunterReadiness(
  options: {
    verifyDiscovery?: boolean;
  } = {},
): Promise<HunterOperatorReadiness> {
  const operationId = randomUUID();
  let env;
  try {
    env = parseServerEnv();
  } catch {
    return {
      configured: false,
      authenticated: false,
      discoveryAccessible: false,
      category: "not_configured",
      operationId,
    };
  }
  if (!env.HUNTER_API_KEY || env.DEFAULT_COMPANY_DISCOVERY_PROVIDER !== "hunter") {
    return {
      configured: false,
      authenticated: false,
      discoveryAccessible: false,
      category: "not_configured",
      operationId,
    };
  }

  const client = createHunterClient(env);
  try {
    const account = await client.request<unknown>("hunter_readiness_account", "/account");
    if (!account || typeof account !== "object" || !("data" in account)) {
      return {
        configured: true,
        authenticated: false,
        discoveryAccessible: false,
        category: "invalid_response",
        operationId,
      };
    }
    if (!options.verifyDiscovery) {
      return { configured: true, authenticated: true, discoveryAccessible: false, operationId };
    }
    const result = await new HunterCompanyDiscoveryProvider(client).discoverCompaniesV1({
      correlationId: operationId,
      targetCountryCode: "US",
      industries: ["Software Development"],
      companySizeMinEmployees: 11,
      companySizeMaxEmployees: 50,
      companyTypes: [],
      qualificationSignals: [],
      disqualificationSignals: [],
      purchaseTriggers: [],
      technologySignals: [],
      keywords: [],
      exclusionDomains: [],
      maxResults: 5,
    });
    return {
      configured: true,
      authenticated: true,
      discoveryAccessible: true,
      operationId,
      resultCount: result.data.candidates.length,
    };
  } catch (error) {
    return {
      configured: true,
      authenticated: !(error instanceof HunterProviderError && error.category === "authentication"),
      discoveryAccessible: false,
      category:
        error instanceof HunterProviderError
          ? readinessCategory(error.category)
          : "provider_unavailable",
      operationId,
    };
  }
}
