import type { OutreachProvider } from "./outreach.provider";
import { OutreachDraftResultSchema, type OutreachGenerationInput } from "./outreach.provider";
import {
  AiProviderError,
  StructuredOpenAiClient,
  type OpenAiClientConfig,
} from "../ai/openai-client";

export class OpenAiOutreachProvider implements OutreachProvider {
  readonly id = "openai";
  readonly version = "1.0.0";
  private readonly client: StructuredOpenAiClient;

  constructor(config: OpenAiClientConfig) {
    this.client = new StructuredOpenAiClient(config);
  }

  async generateOutreachDraft(input: OutreachGenerationInput) {
    const result = await this.client.generate(
      "outreach_draft_v1",
      input,
      OutreachDraftResultSchema,
    );
    const draft = result.data.draft;
    const request = input.outreachRequest;
    if (request.channel.startsWith("linkedin_") && draft.subject !== null) {
      throw new AiProviderError("invalid_output", "Outreach output was incompatible.");
    }
    if (
      draft.channel !== request.channel ||
      draft.messageType !== request.messageType ||
      draft.language !== request.language ||
      draft.tone !== request.tone ||
      draft.length !== request.length
    ) {
      throw new AiProviderError("invalid_output", "Outreach output was incompatible.");
    }
    return result;
  }
}
