import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env/env";
import {
  checkOpenAiReadiness,
  resolveOpenAiReadinessConfig,
} from "@/lib/providers/ai/openai-readiness";
import { SmtpEmailProvider } from "@/lib/providers/email/smtp-email.provider";
import { OpenAiProvider } from "@/lib/providers/ai/openai-ai.provider";
import { AiProviderError } from "@/lib/providers/ai/openai-client";
import { v2ProductAnalysisResultSchema } from "@/lib/providers/ai/ai.provider";
import { countrySpecificIcpResultSchema } from "@/lib/providers/ai/ai.provider";

const openAiEnabled = process.env.REAL_OPENAI_SMOKE === "true";
const smtpEnabled = process.env.REAL_SMTP_SMOKE === "true";
const productAnalysisEnabled = process.env.REAL_OPENAI_PRODUCT_ANALYSIS_SMOKE === "true";
const countryIcpEnabled = process.env.REAL_OPENAI_ICP_SMOKE === "true";

describe("opt-in production provider smoke tests", () => {
  it.runIf(openAiEnabled)("checks OpenAI authentication and configured model access", async () => {
    let env: ReturnType<typeof resolveOpenAiReadinessConfig>;
    try {
      env = resolveOpenAiReadinessConfig(process.env);
    } catch (error) {
      void error;
      console.error(JSON.stringify({ event: "openai.readiness.configuration_invalid" }));
      throw new Error("OpenAI readiness configuration is invalid.");
    }
    const result = await checkOpenAiReadiness({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL,
      timeoutMs: Math.min(env.OPENAI_TIMEOUT_MS, 15_000),
    });
    expect(result).toMatchObject({
      providerConfigured: true,
      authenticationValid: true,
      modelConfigured: true,
      modelAccessible: true,
      errorCategory: null,
    });
  });

  it.runIf(productAnalysisEnabled)(
    "runs one sanitized strict product-analysis operation",
    async () => {
      const env = resolveOpenAiReadinessConfig(process.env);
      const provider = new OpenAiProvider({
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
        timeoutMs: Math.min(env.OPENAI_TIMEOUT_MS, 30_000),
        maxRetries: 0,
        maxOutputTokens: 800,
      });
      try {
        const result = await provider.analyzeProductV2({
          schemaVersion: "v2",
          productName: "Sanitized B2B SaaS Fixture",
          productDescription:
            "A generic workflow tool for small business teams. This fixture contains no user data.",
          currentMarkets: [],
          preferredLanguage: "en",
        });
        const schemaValid = v2ProductAnalysisResultSchema.safeParse(result.data).success;
        console.info(
          JSON.stringify({
            event: "openai.product_analysis_smoke",
            success: schemaValid,
            schemaValid,
            finishReason: result.meta.finishReason,
            inputTokens: result.meta.inputTokens,
            outputTokens: result.meta.outputTokens,
            provider: result.meta.providerName,
            model: result.meta.modelId,
            providerCalls: result.meta.providerCalls,
            operationId: result.meta.operationId,
          }),
        );
        expect(schemaValid).toBe(true);
      } catch (error) {
        if (error instanceof AiProviderError) {
          console.error(
            JSON.stringify({
              event: "openai.product_analysis_smoke",
              success: false,
              category: error.code,
              finishReason: error.diagnostics.finishReason,
              invalidFields: error.diagnostics.invalidFieldPaths,
              retryAttempted: error.diagnostics.retryAttempted,
              providerCalls: error.diagnostics.attempts?.length,
              operationId: error.operationId,
            }),
          );
        }
        throw error;
      }
    },
  );

  it.runIf(smtpEnabled)(
    "sends one SMTP message only to the explicit operator address",
    async () => {
      const env = parseServerEnv();
      if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_SMOKE_TO)
        throw new Error("Complete SMTP credentials and SMTP_SMOKE_TO are required.");
      const provider = new SmtpEmailProvider({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        timeoutMs: Math.min(env.SMTP_TIMEOUT_MS, 15_000),
        maxRetries: 0,
      });
      const result = await provider.send({
        to: env.SMTP_SMOKE_TO,
        from: env.EMAIL_FROM,
        subject: "Marketra SMTP smoke test",
        body: "Operator-requested Marketra transactional email smoke test.",
        category: "system_notification",
      });
      expect(result.data.status).toBe("sent");
    },
  );

  it.runIf(countryIcpEnabled)("runs one sanitized strict country ICP operation", async () => {
    const env = resolveOpenAiReadinessConfig(process.env);
    const provider = new OpenAiProvider({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL,
      timeoutMs: Math.min(env.OPENAI_TIMEOUT_MS, 30_000),
      maxRetries: 0,
      maxOutputTokens: 1_600,
    });
    try {
      const result = await provider.generateCountrySpecificIcpV1({
        countryCode: "US",
        countryName: "United States",
        productName: "Sanitized Workflow SaaS",
        productDescription: "A generic workflow tool. No user or production data is included.",
        productSummary: "Workflow coordination software for small B2B teams.",
        coreProblem: "Manual work coordination",
        valueProposition: "Reduce repetitive coordination work",
        capabilities: ["Workflow templates", "Task coordination"],
        customerCategories: ["B2B SaaS"],
        buyerRoles: ["Operations leader"],
        userRoles: ["Operations specialist"],
        adoptionBarriers: ["Change management"],
        purchaseTriggers: ["Team growth"],
        marketRecommendation: "investigate",
        marketConfidence: "medium",
        strongestFitSignals: ["Cloud software adoption"],
        weakestFitSignals: ["Competitive category"],
        relevantCustomerSegments: ["Small B2B teams"],
        localizationRequirements: "English fixture",
        acquisitionChannels: ["Content"],
        regulatoryConsiderations: "Standard privacy review",
        operationalChallenges: ["Limited implementation capacity"],
        unresolvedQuestions: ["Local willingness to pay"],
        countryRegion: "North America",
      });
      const schemaValid = countrySpecificIcpResultSchema.safeParse(result.data).success;
      console.info(
        JSON.stringify({
          event: "openai.country_icp_smoke",
          success: schemaValid,
          provider: result.meta.providerName,
          model: result.meta.modelId,
          safeCategory: schemaValid ? null : "structured_output_invalid",
          schemaValid,
          finishReason: result.meta.finishReason,
          inputTokens: result.meta.inputTokens,
          outputTokens: result.meta.outputTokens,
          operationId: result.meta.operationId,
          providerCalls: result.meta.providerCalls,
        }),
      );
      expect(schemaValid).toBe(true);
    } catch (error) {
      if (error instanceof AiProviderError) {
        console.error(
          JSON.stringify({
            event: "openai.country_icp_smoke",
            success: false,
            safeCategory: error.code,
            schemaValid: false,
            finishReason: error.diagnostics.finishReason,
            inputTokens: undefined,
            outputTokens: undefined,
            operationId: error.operationId,
            providerCalls: error.diagnostics.attempts?.length,
          }),
        );
      }
      throw error;
    }
  });
});
