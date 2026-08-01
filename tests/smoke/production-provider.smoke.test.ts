import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env/env";
import {
  checkOpenAiReadiness,
  resolveOpenAiReadinessConfig,
} from "@/lib/providers/ai/openai-readiness";
import { SmtpEmailProvider } from "@/lib/providers/email/smtp-email.provider";

const openAiEnabled = process.env.REAL_OPENAI_SMOKE === "true";
const smtpEnabled = process.env.REAL_SMTP_SMOKE === "true";

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
});
