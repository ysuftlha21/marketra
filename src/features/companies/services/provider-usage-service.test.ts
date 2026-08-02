import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
}));

vi.mock("@/lib/db/supabase-service", () => ({
  createServiceRoleClient: () => ({
    from: () => ({ insert: mocks.insert }),
  }),
}));

vi.mock("@/features/workspaces/services/workspace-plan-service", () => ({
  resolveWorkspacePlan: vi.fn().mockResolvedValue({ plan: { id: "free" } }),
}));

const input = {
  workspaceId: "00000000-0000-4000-a000-000000000001",
  projectId: "00000000-0000-4000-a000-000000000002",
  operation: "company_search" as const,
  providerId: "hunter",
  operationId: "00000000-0000-4000-a000-000000000003",
  idempotencyKey: "run:company_search",
  success: true,
};

describe("recordProviderOperation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("treats an idempotency conflict as already recorded", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "23505" } });
    const { recordProviderOperation } = await import("./provider-usage-service");
    await expect(recordProviderOperation(input)).resolves.toBeUndefined();
  });

  it("returns a controlled record failure without leaking database details", async () => {
    const secret = "private-database-detail";
    mocks.insert.mockResolvedValue({ error: { code: "42501", message: secret } });
    const { recordProviderOperation } = await import("./provider-usage-service");
    await expect(recordProviderOperation(input)).rejects.toMatchObject({ code: "record_failed" });
    const logs = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logs).toContain("provider_usage_permission_denied");
    expect(logs).not.toContain(secret);
  });
});
