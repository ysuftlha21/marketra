import type { AiProvider } from "./ai.provider";
import { MockAiProvider } from "./mock-ai.provider";

export type AiProviderId = "mock" | "openai";

export function createAiProvider(id: AiProviderId): AiProvider {
  switch (id) {
    case "mock":
      return new MockAiProvider();
    case "openai":
      throw new Error(
        "OpenAiProvider is not implemented in Phase 1. Set DEFAULT_AI_PROVIDER=mock for local development.",
      );
    default: {
      const exhaustive: never = id;
      throw new Error(`Unknown AI provider: ${String(exhaustive)}`);
    }
  }
}
