import { describe, it, expect } from "vitest";
import {
  createOutreachProvider,
  OutreachProviderConfigError,
} from "@/lib/providers/outreach/outreach.factory";
import { MockOutreachProvider } from "@/lib/providers/outreach/mock-outreach.provider";
import type { OutreachGenerationInput } from "@/lib/providers/outreach/outreach.provider";

const baseInput: OutreachGenerationInput = {
  correlationId: "test-001",
  schemaVersion: "1.0.0",
  workspaceContext: { workspaceId: "00000000-0000-1000-8000-000000000000", workspaceName: "Test" },
  productContext: {
    productName: "CloudFlow",
    productDescription: "DevOps platform",
    capabilities: [],
  },
  icpContext: {
    industries: ["SaaS"],
    companySizes: ["50-200"],
    buyerRoles: ["CTO"],
    pains: ["Slow deployments"],
    desiredOutcomes: ["Faster releases"],
  },
  companyContext: {
    companyName: "Acme Corp",
    industry: "FinTech",
    employeeCountMin: 50,
    employeeCountMax: 200,
    companySize: "Mid",
    fitScore: 85,
    qualificationReasons: ["Strong ICP match", "Active in target market"],
    disqualificationReasons: [],
    purchaseSignals: ["Recently posted DevOps job"],
    discoveryEvidence: ["Matched industry"],
  },
  decisionRoleContext: {
    roleKey: "cto",
    roleTitle: "Chief Technology Officer",
    roleFamily: "Engineering",
    department: "Technology",
    buyingRole: "decision_maker",
    priority: "primary",
    fitScore: 90,
    likelyPainPoints: ["Deployment bottlenecks", "Manual QA"],
    likelyObjections: ["Budget constraints"],
    recommendedMessageAngles: ["Reduced time-to-market", "Team efficiency"],
    reasoning: "Primary technical decision maker for infrastructure tools",
  },
  outreachRequest: {
    channel: "email",
    messageType: "initial_contact",
    language: "en",
    tone: "professional",
    length: "medium",
    objective: "Improve deployment velocity",
  },
};

describe("MockOutreachProvider", () => {
  it("returns dataset with data and meta", async () => {
    const provider = new MockOutreachProvider();
    const result = await provider.generateOutreachDraft(baseInput);
    expect(result.data).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.meta.isMock).toBe(true);
    expect(result.meta.providerName).toBe("mock");
  });

  it("returns draft with correct schema version", async () => {
    const provider = new MockOutreachProvider();
    const result = await provider.generateOutreachDraft(baseInput);
    expect(result.data.schemaVersion).toBe("1.0.0");
  });

  it("produces English output when language is en", async () => {
    const provider = new MockOutreachProvider();
    const result = await provider.generateOutreachDraft(baseInput);
    expect(result.data.draft.language).toBe("en");
    expect(result.data.draft.body).toMatch(/CloudFlow/);
  });

  it("produces Turkish output when language is tr", async () => {
    const provider = new MockOutreachProvider();
    const input: OutreachGenerationInput = {
      ...baseInput,
      outreachRequest: { ...baseInput.outreachRequest, language: "tr" },
    };
    const result = await provider.generateOutreachDraft(input);
    expect(result.data.draft.language).toBe("tr");
    expect(result.data.draft.body).toMatch(/CloudFlow/);
  });

  it("returns no subject for linkedin_connection channel", async () => {
    const provider = new MockOutreachProvider();
    const input: OutreachGenerationInput = {
      ...baseInput,
      outreachRequest: {
        ...baseInput.outreachRequest,
        channel: "linkedin_connection",
        messageType: "connection_request",
      },
    };
    const result = await provider.generateOutreachDraft(input);
    expect(result.data.draft.subject).toBeNull();
  });

  it("returns no subject for linkedin_message channel", async () => {
    const provider = new MockOutreachProvider();
    const input: OutreachGenerationInput = {
      ...baseInput,
      outreachRequest: {
        ...baseInput.outreachRequest,
        channel: "linkedin_message",
        messageType: "initial_contact",
      },
    };
    const result = await provider.generateOutreachDraft(input);
    expect(result.data.draft.subject).toBeNull();
  });

  it("includes subject for email channel", async () => {
    const provider = new MockOutreachProvider();
    const result = await provider.generateOutreachDraft(baseInput);
    expect(result.data.draft.subject).toBeTruthy();
  });

  it("varies output by channel", async () => {
    const provider = new MockOutreachProvider();
    const emailResult = await provider.generateOutreachDraft(baseInput);
    const linkedinInput: OutreachGenerationInput = {
      ...baseInput,
      outreachRequest: {
        ...baseInput.outreachRequest,
        channel: "linkedin_connection",
        messageType: "connection_request",
      },
    };
    const linkedinResult = await provider.generateOutreachDraft(linkedinInput);
    expect(emailResult.data.draft.body).not.toBe(linkedinResult.data.draft.body);
  });

  it("varies output by message type", async () => {
    const provider = new MockOutreachProvider();
    const initialResult = await provider.generateOutreachDraft(baseInput);
    const meetingInput: OutreachGenerationInput = {
      ...baseInput,
      outreachRequest: {
        ...baseInput.outreachRequest,
        messageType: "meeting_request",
      },
    };
    const meetingResult = await provider.generateOutreachDraft(meetingInput);
    expect(initialResult.data.draft.body).not.toBe(meetingResult.data.draft.body);
  });

  it("varies output by tone", async () => {
    const provider = new MockOutreachProvider();
    const profResult = await provider.generateOutreachDraft(baseInput);
    const friendlyInput: OutreachGenerationInput = {
      ...baseInput,
      outreachRequest: { ...baseInput.outreachRequest, tone: "friendly" },
    };
    const friendlyResult = await provider.generateOutreachDraft(friendlyInput);
    expect(profResult.data.draft.body).not.toBe(friendlyResult.data.draft.body);
  });

  it("varies output by length", async () => {
    const provider = new MockOutreachProvider();
    const mediumResult = await provider.generateOutreachDraft(baseInput);
    const shortInput: OutreachGenerationInput = {
      ...baseInput,
      outreachRequest: { ...baseInput.outreachRequest, length: "short" },
    };
    const shortResult = await provider.generateOutreachDraft(shortInput);
    expect(shortResult.data.draft.body.length).toBeLessThan(mediumResult.data.draft.body.length);
  });

  it("includes personalization summary", async () => {
    const provider = new MockOutreachProvider();
    const result = await provider.generateOutreachDraft(baseInput);
    expect(result.data.personalizationSummary.companyContextUsed).toContain("Acme Corp");
    expect(result.data.personalizationSummary.roleContextUsed).toContain(
      "Chief Technology Officer",
    );
  });

  it("includes evidence, assumptions, warnings, missingInformation", async () => {
    const provider = new MockOutreachProvider();
    const result = await provider.generateOutreachDraft(baseInput);
    expect(result.data.evidenceUsed.length).toBeGreaterThan(0);
    expect(result.data.assumptions.length).toBeGreaterThan(0);
    expect(result.data.missingInformation.length).toBeGreaterThan(0);
  });

  it("includes country context when marketContext is provided", async () => {
    const provider = new MockOutreachProvider();
    const input: OutreachGenerationInput = {
      ...baseInput,
      marketContext: {
        countryCode: "DE",
        countryName: "Germany",
        opportunities: ["High tech adoption"],
        risks: ["Regulatory"],
      },
    };
    const result = await provider.generateOutreachDraft(input);
    expect(result.data.personalizationSummary.countryOrMarketContextUsed).toBe("Germany");
  });

  it("does not invent person names", async () => {
    const provider = new MockOutreachProvider();
    const result = await provider.generateOutreachDraft(baseInput);
    expect(result.data.draft.body).not.toMatch(/\b(John|Jane|Smith|Doe)\b/);
  });

  it("does not invent email addresses", async () => {
    const provider = new MockOutreachProvider();
    const result = await provider.generateOutreachDraft(baseInput);
    expect(result.data.draft.body).not.toMatch(/@/);
  });

  it("does not invent LinkedIn URLs", async () => {
    const provider = new MockOutreachProvider();
    const result = await provider.generateOutreachDraft(baseInput);
    expect(result.data.draft.body).not.toMatch(/linkedin\.com/);
  });

  it("uses conservative phrasing", async () => {
    const provider = new MockOutreachProvider();
    const result = await provider.generateOutreachDraft(baseInput);
    // The body should contain cautious phrasing rather than definitive claims
    expect(result.data.draft.body).toMatch(/may be|often look|relevant if/i);
  });

  it("produces deterministic output for same input", async () => {
    const provider = new MockOutreachProvider();
    const r1 = await provider.generateOutreachDraft(baseInput);
    const r2 = await provider.generateOutreachDraft(baseInput);
    expect(r1.data.draft.body).toBe(r2.data.draft.body);
    expect(r1.data.confidence).toBe(r2.data.confidence);
  });
});

describe("OutreachProvider factory", () => {
  it("returns MockOutreachProvider for 'mock'", () => {
    const provider = createOutreachProvider("mock");
    expect(provider).toBeInstanceOf(MockOutreachProvider);
    expect(provider.id).toBe("mock");
  });

  it("throws for unknown provider", () => {
    expect(() => createOutreachProvider("unsupported")).toThrow(OutreachProviderConfigError);
  });

  it("has a version string", () => {
    const provider = createOutreachProvider("mock");
    expect(provider.version).toBeTruthy();
  });
});
