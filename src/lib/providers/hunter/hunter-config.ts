import type { ServerEnv } from "@/lib/env/env";
import { HunterClient } from "./hunter-client";

export function createHunterClient(env: ServerEnv): HunterClient {
  if (!env.HUNTER_API_KEY) throw new Error("Hunter is not configured.");
  return new HunterClient({
    apiKey: env.HUNTER_API_KEY,
    baseUrl: env.HUNTER_BASE_URL,
    timeoutMs: env.HUNTER_TIMEOUT_MS,
    maxRetries: env.HUNTER_MAX_RETRIES,
  });
}
