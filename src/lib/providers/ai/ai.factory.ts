import type { AiProvider } from "./ai.provider";
import { MockAiProvider } from "./mock-ai.provider";
import { OpenAiProvider } from "./openai-ai.provider";
import { parseServerEnv } from "@/lib/env/env";

export type AiProviderId = "mock" | "openai";
export interface AiProviderFactoryConfig {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
  maxOutputTokens?: number;
}

export function createAiProvider(id: AiProviderId, config?: AiProviderFactoryConfig): AiProvider {
  switch (id) {
    case "mock":
      return new MockAiProvider();
    case "openai":
      const env = parseServerEnv();
      const apiKey = config ? config.apiKey : env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OpenAI provider credentials are unavailable.");
      return new OpenAiProvider({
        apiKey,
        model: config?.model ?? env.OPENAI_MODEL,
        timeoutMs: config?.timeoutMs ?? env.OPENAI_TIMEOUT_MS,
        maxRetries: config?.maxRetries ?? env.OPENAI_MAX_RETRIES,
        maxOutputTokens: config?.maxOutputTokens ?? env.OPENAI_MAX_OUTPUT_TOKENS,
      });
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown AI provider: ${String(exhaustive)}`);
    }
  }
}
