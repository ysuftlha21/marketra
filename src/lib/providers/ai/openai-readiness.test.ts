import { afterEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { checkOpenAiReadiness, resolveOpenAiReadinessConfig } from "./openai-readiness";

describe("OpenAI readiness", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retrieves only the configured model and returns safe fields", async () => {
    const retrieveModel = vi.fn().mockResolvedValue({ id: "gpt-4o-mini" });
    const result = await checkOpenAiReadiness({
      apiKey: "secret-readiness-key",
      model: "gpt-4o-mini",
      timeoutMs: 1_000,
      retrieveModel,
    });

    expect(result).toMatchObject({
      providerConfigured: true,
      authenticationValid: true,
      modelConfigured: true,
      modelAccessible: true,
      errorCategory: null,
    });
    expect(result.operationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(retrieveModel).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain("secret-readiness-key");
  });

  it("returns a safe category and never leaks provider responses", async () => {
    const retrieveModel = vi
      .fn()
      .mockRejectedValue(
        OpenAI.APIError.generate(
          404,
          { error: { code: "model_not_found", message: "raw provider response" } },
          undefined,
          new Headers(),
        ),
      );

    const result = await checkOpenAiReadiness({
      apiKey: "secret-readiness-key",
      model: "gpt-4o-mini",
      timeoutMs: 1_000,
      retrieveModel,
    });
    expect(result).toMatchObject({
      authenticationValid: true,
      modelAccessible: false,
      errorCategory: "model_not_found",
    });
    expect(JSON.stringify(result)).not.toMatch(/secret-readiness-key|secret-host|raw provider/i);
  });

  it("does not make a request without complete server configuration", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await checkOpenAiReadiness({ timeoutMs: 1_000 });
    expect(result).toMatchObject({
      providerConfigured: false,
      authenticationValid: false,
      modelConfigured: false,
      modelAccessible: false,
      errorCategory: "provider_unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts only the verified readiness model", () => {
    expect(
      resolveOpenAiReadinessConfig({
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "gpt-4o-mini",
        OPENAI_TIMEOUT_MS: "1000",
      }).OPENAI_MODEL,
    ).toBe("gpt-4o-mini");
    expect(() =>
      resolveOpenAiReadinessConfig({
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "gpt-5.6-luna",
      }),
    ).toThrow();
  });
});
