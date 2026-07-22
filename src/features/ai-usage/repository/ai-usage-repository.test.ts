import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { recordAiUsageWithClient, summarizeAiUsageWithClient } from "./ai-usage-repository";

describe("AI usage repository", () => {
  it("records accounting metadata without prompt or generated body fields", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient<Database>;
    await recordAiUsageWithClient(client, {
      workspaceId: "00000000-0000-4000-8000-000000000001",
      operationType: "outreach",
      providerId: "openai",
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      durationMs: 20,
      success: true,
    });
    const row = insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row).toMatchObject({ input_tokens: 10, output_tokens: 5, total_tokens: 15 });
    expect(row).not.toHaveProperty("prompt");
    expect(row).not.toHaveProperty("body");
  });

  it("returns a zero fallback while the sequential migration is not installed", async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: { code: "42P01" } });
    const select = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ select })) } as unknown as SupabaseClient<Database>;
    await expect(summarizeAiUsageWithClient(client, "workspace-id")).resolves.toEqual({
      operations: 0,
      successfulOperations: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    });
  });
});
