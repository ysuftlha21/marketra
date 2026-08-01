import type { OutreachProvider } from "./outreach.provider";
import { MockOutreachProvider } from "./mock-outreach.provider";
import { OpenAiOutreachProvider } from "./openai-outreach.provider";
import { parseServerEnv } from "@/lib/env/env";

export class OutreachProviderConfigError extends Error {
  constructor(providerId: string) {
    super(`Outreach provider '${providerId}' is not available.`);
    this.name = "OutreachProviderConfigError";
  }
}

export function createOutreachProvider(providerId: string): OutreachProvider {
  if (providerId === "mock") {
    return new MockOutreachProvider();
  }
  if (providerId === "openai") {
    const env = parseServerEnv();
    if (!env.OPENAI_API_KEY) throw new OutreachProviderConfigError(providerId);
    return new OpenAiOutreachProvider({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL,
      reasoningEffort: env.OPENAI_REASONING_EFFORT,
      timeoutMs: env.OPENAI_TIMEOUT_MS,
      maxRetries: env.OPENAI_MAX_RETRIES,
      maxOutputTokens: env.OPENAI_MAX_OUTPUT_TOKENS,
    });
  }

  throw new OutreachProviderConfigError(providerId);
}
