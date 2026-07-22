import { describe, expect, it, vi } from "vitest";
import { OpenAiOutreachProvider } from "./openai-outreach.provider";

const { generate } = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("../ai/openai-client", () => ({
  AiProviderError: class extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
  StructuredOpenAiClient: class {
    generate = generate;
  },
}));

const input = {
  correlationId: "c",
  schemaVersion: "1.0.0",
  workspaceContext: { workspaceId: "w", workspaceName: "W" },
  productContext: {
    productName: "P",
    productDescription: "D",
    capabilities: [],
    targetCustomerSummary: "T",
  },
  companyContext: {
    companyName: "C",
    industry: "SaaS",
    employeeCountMin: null,
    employeeCountMax: null,
    fitScore: 0,
    qualificationReasons: [],
    disqualificationReasons: [],
    matchedSignals: [],
    missingSignals: [],
    purchaseSignals: [],
    discoveryEvidence: [],
  },
  icpContext: {
    industries: [],
    companySizes: [],
    buyerRoles: [],
    pains: [],
    desiredOutcomes: [],
  },
  decisionRoleContext: {
    roleKey: "r",
    roleTitle: "CEO",
    roleFamily: "executive",
    department: "Executive",
    buyingRole: "decision_maker",
    priority: "primary" as const,
    fitScore: 90,
    likelyPainPoints: [],
    likelyObjections: [],
    recommendedMessageAngles: [],
    reasoning: "fit",
  },
  outreachRequest: {
    channel: "linkedin_message" as const,
    messageType: "initial_contact" as const,
    language: "en" as const,
    tone: "professional" as const,
    length: "short" as const,
    objective: "meeting",
  },
};

describe("OpenAiOutreachProvider", () => {
  it("rejects a subject for LinkedIn output", async () => {
    generate.mockResolvedValue({
      data: {
        draft: {
          channel: "linkedin_message",
          messageType: "initial_contact",
          language: "en",
          subject: "not allowed",
          body: "Body",
          callToAction: "Reply",
          tone: "professional",
          length: "short",
        },
      },
      meta: {},
    });
    const provider = new OpenAiOutreachProvider({
      apiKey: "test",
      model: "gpt-4o-mini",
      timeoutMs: 1,
      maxRetries: 0,
    });
    await expect(provider.generateOutreachDraft(input)).rejects.toMatchObject({
      code: "invalid_output",
      message: "Outreach output was incompatible.",
    });
  });
});
