import { describe, it, expect } from "vitest";
import { parsePublicEnv, parseServerEnv, EnvironmentValidationError } from "@/lib/env/env";

describe("parsePublicEnv", () => {
  it("applies defaults for missing public env", () => {
    const env = parsePublicEnv({});
    expect(env.NEXT_PUBLIC_APP_NAME).toBe("Marketra");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("rejects an invalid APP_URL", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_APP_URL: "not-a-url" })).toThrow(
      EnvironmentValidationError,
    );
  });
});

describe("parseServerEnv", () => {
  it("defaults all providers to mock", () => {
    const env = parseServerEnv({});
    expect(env.DEFAULT_AI_PROVIDER).toBe("mock");
    expect(env.DEFAULT_LEAD_PROVIDER).toBe("mock");
    expect(env.DEFAULT_MARKET_INTELLIGENCE_PROVIDER).toBe("mock");
    expect(env.DEFAULT_BILLING_PROVIDER).toBe("mock");
    expect(env.DEFAULT_EMAIL_PROVIDER).toBe("mock");
    expect(env.DEFAULT_ANALYTICS_PROVIDER).toBe("mock");
    expect(env.DEFAULT_COMPANY_DISCOVERY_PROVIDER).toBe("mock");
    expect(env.DEFAULT_BUYER_DISCOVERY_PROVIDER).toBe("mock");
    expect(env.DEFAULT_EMAIL_ENRICHMENT_PROVIDER).toBe("mock");
    expect(env.DEFAULT_OUTREACH_PROVIDER).toBe("mock");
    expect(env.DEFAULT_RATE_LIMIT_PROVIDER).toBe("mock");
  });

  it("requires Hunter credentials only when Hunter or its smoke test is enabled", () => {
    expect(parseServerEnv({}).HUNTER_BASE_URL).toBe("https://api.hunter.io/v2");
    expect(() => parseServerEnv({ DEFAULT_COMPANY_DISCOVERY_PROVIDER: "hunter" })).toThrow(
      EnvironmentValidationError,
    );
    expect(
      parseServerEnv({ DEFAULT_COMPANY_DISCOVERY_PROVIDER: "hunter", HUNTER_API_KEY: "test-key" })
        .DEFAULT_COMPANY_DISCOVERY_PROVIDER,
    ).toBe("hunter");
    expect(() => parseServerEnv({ HUNTER_SMOKE: "true" })).toThrow(EnvironmentValidationError);
  });

  it("defaults NODE_ENV to development", () => {
    expect(parseServerEnv({}).NODE_ENV).toBe("development");
  });

  it("accepts valid APP_ENV values", () => {
    expect(parseServerEnv({ APP_ENV: "development" }).APP_ENV).toBe("development");
    expect(parseServerEnv({ APP_ENV: "production" }).APP_ENV).toBe("production");
    expect(parseServerEnv({ APP_ENV: "staging" }).APP_ENV).toBe("staging");
  });

  it("rejects invalid APP_ENV", () => {
    expect(() => parseServerEnv({ APP_ENV: "dev" })).toThrow(EnvironmentValidationError);
  });

  it("defaults OPENAI_MODEL to gpt-4o-mini", () => {
    expect(parseServerEnv({}).OPENAI_MODEL).toBe("gpt-4o-mini");
  });

  it("defaults OPENAI_PROMPT_VERSION to v1", () => {
    expect(parseServerEnv({}).OPENAI_PROMPT_VERSION).toBe("v1");
  });

  it("coerces numeric OPENAI_TIMEOUT_MS", () => {
    expect(parseServerEnv({ OPENAI_TIMEOUT_MS: "15000" }).OPENAI_TIMEOUT_MS).toBe(15000);
  });

  it("rejects negative OPENAI_TIMEOUT_MS", () => {
    expect(() => parseServerEnv({ OPENAI_TIMEOUT_MS: "-1" })).toThrow(EnvironmentValidationError);
  });

  it("rejects zero OPENAI_TIMEOUT_MS", () => {
    expect(() => parseServerEnv({ OPENAI_TIMEOUT_MS: "0" })).toThrow(EnvironmentValidationError);
  });

  it("rejects an unknown provider id", () => {
    expect(() => parseServerEnv({ DEFAULT_AI_PROVIDER: "bogus" })).toThrow(
      EnvironmentValidationError,
    );
  });

  it("rejects an unknown outreach provider id", () => {
    expect(() => parseServerEnv({ DEFAULT_OUTREACH_PROVIDER: "unknown" })).toThrow(
      EnvironmentValidationError,
    );
  });

  it("parses AI_COST_TRACKING_ENABLED boolean", () => {
    expect(parseServerEnv({ AI_COST_TRACKING_ENABLED: "false" }).AI_COST_TRACKING_ENABLED).toBe(
      false,
    );
    expect(parseServerEnv({ AI_COST_TRACKING_ENABLED: "true" }).AI_COST_TRACKING_ENABLED).toBe(
      true,
    );
  });

  it("defaults RATE_LIMIT_WINDOW_SECONDS and RATE_LIMIT_MAX_REQUESTS", () => {
    const env = parseServerEnv({});
    expect(env.RATE_LIMIT_WINDOW_SECONDS).toBe(60);
    expect(env.RATE_LIMIT_MAX_REQUESTS).toBe(60);
  });

  it("defaults SMTP_PORT to 587", () => {
    expect(parseServerEnv({}).SMTP_PORT).toBe(587);
  });

  it("defaults EMAIL_FROM to marketra.example", () => {
    const env = parseServerEnv({});
    expect(env.EMAIL_FROM).toContain("marketra.example");
  });

  it("requires OPENAI_API_KEY when provider is openai", () => {
    expect(() => parseServerEnv({ DEFAULT_AI_PROVIDER: "openai" })).toThrow(
      EnvironmentValidationError,
    );
  });

  it("allows OPENAI_API_KEY to be absent when provider is mock", () => {
    const env = parseServerEnv({ DEFAULT_AI_PROVIDER: "mock" });
    expect(env.OPENAI_API_KEY).toBeUndefined();
  });

  it("requires STRIPE_SECRET_KEY when billing provider is stripe", () => {
    expect(() => parseServerEnv({ DEFAULT_BILLING_PROVIDER: "stripe" })).toThrow(
      EnvironmentValidationError,
    );
  });

  it("requires PayTR credentials when billing provider is paytr", () => {
    expect(() => parseServerEnv({ DEFAULT_BILLING_PROVIDER: "paytr" })).toThrow(
      EnvironmentValidationError,
    );
  });

  it("requires iyzico credentials when billing provider is iyzico", () => {
    expect(() => parseServerEnv({ DEFAULT_BILLING_PROVIDER: "iyzico" })).toThrow(
      EnvironmentValidationError,
    );
  });

  it("allows empty billing credentials when provider is mock", () => {
    const env = parseServerEnv({ DEFAULT_BILLING_PROVIDER: "mock" });
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
  });

  it("requires SMTP_HOST when email provider is smtp", () => {
    expect(() => parseServerEnv({ DEFAULT_EMAIL_PROVIDER: "smtp" })).toThrow(
      EnvironmentValidationError,
    );
  });

  it("requires endpoint credentials for external rate limiting", () => {
    expect(() => parseServerEnv({ DEFAULT_RATE_LIMIT_PROVIDER: "external" })).toThrow(
      EnvironmentValidationError,
    );
  });

  it("rejects unknown OpenAI models", () => {
    expect(() => parseServerEnv({ OPENAI_MODEL: "unknown-model" })).toThrow(
      EnvironmentValidationError,
    );
  });

  it("allows empty SMTP credentials when provider is mock", () => {
    const env = parseServerEnv({ DEFAULT_EMAIL_PROVIDER: "mock" });
    expect(env.SMTP_HOST).toBeUndefined();
  });

  it("does not leak secret values when a validation error occurs", () => {
    // Provide a realistic secret value and trigger a different validation failure.
    // Zod's flatten() strips input values, so only field names/messages survive.
    const secretValue = "sk-test-secret-12345";
    try {
      parseServerEnv({
        OPENAI_API_KEY: secretValue,
        SMTP_PASSWORD: "super-secret-pwd",
        DEFAULT_EMAIL_PROVIDER: "smtp",
      });
    } catch (err) {
      if (err instanceof EnvironmentValidationError) {
        const msg = JSON.stringify(err.issues);
        // Field names (OPENAI_API_KEY, SMTP_PASSWORD) and messages are metadata;
        // actual secret VALUES must never appear in the error serialization.
        expect(msg).not.toContain(secretValue);
        expect(msg).not.toContain("super-secret-pwd");
      }
    }
  });
});
