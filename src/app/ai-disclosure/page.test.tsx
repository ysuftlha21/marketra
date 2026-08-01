import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AiDisclosurePage from "./page";

describe("AI disclosure page", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("renders safely when the verified API model is selected", () => {
    vi.stubEnv("DEFAULT_AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_MODEL", "gpt-4o-mini");
    vi.stubEnv("OPENAI_API_KEY", "test-only-key-that-must-not-render");
    render(<AiDisclosurePage />);
    expect(screen.getByText(/GPT-4o model family/i)).toBeInTheDocument();
    expect(screen.queryByText(/test-only-key-that-must-not-render/i)).not.toBeInTheDocument();
  });
});
