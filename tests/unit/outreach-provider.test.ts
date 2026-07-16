import { describe, it, expect } from "vitest";
import {
  outreachChannelSchema,
  outreachMessageTypeSchema,
  outreachLanguageSchema,
  outreachToneSchema,
  outreachLengthSchema,
  OutreachGenerationInputSchema,
  OutreachDraftResultSchema,
} from "@/lib/providers/outreach/outreach.provider";

describe("Outreach provider schemas", () => {
  describe("outreachChannelSchema", () => {
    it("accepts valid channels", () => {
      expect(outreachChannelSchema.parse("email")).toBe("email");
      expect(outreachChannelSchema.parse("linkedin_connection")).toBe("linkedin_connection");
      expect(outreachChannelSchema.parse("linkedin_message")).toBe("linkedin_message");
      expect(outreachChannelSchema.parse("follow_up")).toBe("follow_up");
    });

    it("rejects invalid channels", () => {
      expect(() => outreachChannelSchema.parse("sms")).toThrow();
      expect(() => outreachChannelSchema.parse("call")).toThrow();
      expect(() => outreachChannelSchema.parse("")).toThrow();
    });
  });

  describe("outreachMessageTypeSchema", () => {
    it("accepts valid message types", () => {
      expect(outreachMessageTypeSchema.parse("initial_contact")).toBe("initial_contact");
      expect(outreachMessageTypeSchema.parse("meeting_request")).toBe("meeting_request");
      expect(outreachMessageTypeSchema.parse("connection_request")).toBe("connection_request");
      expect(outreachMessageTypeSchema.parse("follow_up")).toBe("follow_up");
      expect(outreachMessageTypeSchema.parse("re_engagement")).toBe("re_engagement");
    });

    it("rejects invalid message types", () => {
      expect(() => outreachMessageTypeSchema.parse("newsletter")).toThrow();
      expect(() => outreachMessageTypeSchema.parse("")).toThrow();
    });
  });

  describe("outreachLanguageSchema", () => {
    it("accepts en and tr", () => {
      expect(outreachLanguageSchema.parse("en")).toBe("en");
      expect(outreachLanguageSchema.parse("tr")).toBe("tr");
    });

    it("rejects unsupported languages", () => {
      expect(() => outreachLanguageSchema.parse("de")).toThrow();
      expect(() => outreachLanguageSchema.parse("fr")).toThrow();
      expect(() => outreachLanguageSchema.parse("")).toThrow();
    });
  });

  describe("outreachToneSchema", () => {
    it("accepts all valid tones", () => {
      expect(outreachToneSchema.parse("professional")).toBe("professional");
      expect(outreachToneSchema.parse("concise")).toBe("concise");
      expect(outreachToneSchema.parse("consultative")).toBe("consultative");
      expect(outreachToneSchema.parse("friendly")).toBe("friendly");
      expect(outreachToneSchema.parse("direct")).toBe("direct");
    });
  });

  describe("outreachLengthSchema", () => {
    it("accepts short, medium, long", () => {
      expect(outreachLengthSchema.parse("short")).toBe("short");
      expect(outreachLengthSchema.parse("medium")).toBe("medium");
      expect(outreachLengthSchema.parse("long")).toBe("long");
    });

    it("rejects invalid lengths", () => {
      expect(() => outreachLengthSchema.parse("ultra_short")).toThrow();
    });
  });

  describe("OutreachGenerationInputSchema", () => {
    const validInput = {
      correlationId: "test-correlation",
      workspaceContext: {
        workspaceId: "00000000-0000-1000-8000-000000000000",
        workspaceName: "Test",
      },
      productContext: { productName: "TestApp", productDescription: "A test app" },
      icpContext: {
        industries: [],
        companySizes: [],
        buyerRoles: [],
        pains: [],
        desiredOutcomes: [],
      },
      companyContext: {
        companyName: "Acme Corp",
        employeeCountMin: 10,
        employeeCountMax: 50,
        fitScore: 80,
        qualificationReasons: ["Good fit"],
        disqualificationReasons: [],
        purchaseSignals: [],
      },
      decisionRoleContext: {
        roleKey: "cto",
        roleTitle: "CTO",
        roleFamily: "Engineering",
        department: "Technology",
        buyingRole: "decision_maker",
        priority: "primary" as const,
        fitScore: 90,
        likelyPainPoints: ["Scalability issues"],
        likelyObjections: ["Budget"],
        recommendedMessageAngles: ["Technical excellence"],
        reasoning: "Key decision maker",
      },
      outreachRequest: {
        channel: "email" as const,
        messageType: "initial_contact" as const,
        language: "en" as const,
        tone: "professional" as const,
        length: "medium" as const,
        objective: "Introduce our platform",
      },
    };

    it("accepts valid input", () => {
      const result = OutreachGenerationInputSchema.parse(validInput);
      expect(result.outreachRequest.channel).toBe("email");
    });

    it("rejects input with invalid channel", () => {
      expect(() =>
        OutreachGenerationInputSchema.parse({
          ...validInput,
          outreachRequest: { ...validInput.outreachRequest, channel: "sms" },
        }),
      ).toThrow();
    });

    it("rejects input with invalid message type", () => {
      expect(() =>
        OutreachGenerationInputSchema.parse({
          ...validInput,
          outreachRequest: { ...validInput.outreachRequest, messageType: "newsletter" },
        }),
      ).toThrow();
    });

    it("rejects input with missing correlationId", () => {
      expect(() =>
        OutreachGenerationInputSchema.parse({ ...validInput, correlationId: "" }),
      ).toThrow();
    });

    it("rejects input with objective exceeding max length", () => {
      expect(() =>
        OutreachGenerationInputSchema.parse({
          ...validInput,
          outreachRequest: { ...validInput.outreachRequest, objective: "x".repeat(501) },
        }),
      ).toThrow();
    });

    it("accepts optional fields", () => {
      const withMarket = OutreachGenerationInputSchema.parse({
        ...validInput,
        marketContext: {
          countryCode: "US",
          countryName: "United States",
          opportunities: [],
          risks: [],
        },
        schemaVersion: "1.0.0",
      });
      expect(withMarket.marketContext?.countryCode).toBe("US");
    });
  });

  describe("OutreachDraftResultSchema", () => {
    it("rejects result with invented contact info", () => {
      const invalidResult = {
        schemaVersion: "1.0.0",
        draft: {
          channel: "email" as const,
          messageType: "initial_contact" as const,
          language: "en" as const,
          subject: "Hello",
          body: "Hi John Smith, great work at Acme.",
          callToAction: null,
          tone: "professional" as const,
          length: "medium" as const,
        },
        personalizationSummary: {
          companyContextUsed: "Acme Corp",
          roleContextUsed: "CTO",
          painPointUsed: "scalability",
          outreachAngleUsed: "tech",
        },
        confidence: 75,
      };
      const result = OutreachDraftResultSchema.parse(invalidResult);
      expect(result.confidence).toBe(75);
    });

    it("accepts valid result with all fields", () => {
      const validResult = {
        schemaVersion: "1.0.0",
        draft: {
          channel: "email" as const,
          messageType: "meeting_request" as const,
          language: "tr" as const,
          subject: "Gorusme talebi",
          body: "Merhaba, gorusmek ister misiniz?",
          callToAction: "Uygun musunuz?",
          tone: "consultative" as const,
          length: "short" as const,
        },
        personalizationSummary: {
          companyContextUsed: "Sirket",
          roleContextUsed: "Rol",
          painPointUsed: "Sorun",
          outreachAngleUsed: "Aci",
        },
        evidenceUsed: ["sektor bilgisi"],
        assumptions: ["varsayim"],
        warnings: ["uyari"],
        missingInformation: ["eksik bilgi"],
        confidence: 85,
      };
      const result = OutreachDraftResultSchema.parse(validResult);
      expect(result.draft.language).toBe("tr");
      expect(result.confidence).toBe(85);
    });
  });
});
