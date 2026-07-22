import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AiProviderError, parseStructuredOutput } from "./openai-client";

describe("OpenAI structured output validation", () => {
  const schema = z.object({ value: z.string().min(1) });
  it("accepts valid schema-conforming JSON", () => {
    expect(parseStructuredOutput('{"value":"ok"}', schema)).toEqual({ value: "ok" });
  });
  it("rejects malformed JSON safely", () => {
    expect(() => parseStructuredOutput("not-json", schema)).toThrow(AiProviderError);
  });
  it("rejects schema-invalid JSON safely", () => {
    expect(() => parseStructuredOutput('{"value":1}', schema)).toThrow(/expected schema/);
  });
});
