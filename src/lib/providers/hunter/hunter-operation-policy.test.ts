import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeHunterOperation } from "./hunter-operation-policy";
import { enforceRateLimit } from "@/lib/security/rate-limit-service";

vi.mock("@/lib/security/rate-limit-service", () => ({ enforceRateLimit: vi.fn() }));

const context = {
  workspaceId: "workspace-1",
  userId: "user-1",
  projectId: "project-1",
  operation: "email_verification" as const,
};

describe("authorizeHunterOperation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fails closed before provider access when entitlement or ownership is denied", async () => {
    await expect(
      authorizeHunterOperation({ ...context, authorize: async () => false }),
    ).rejects.toThrow(/not available/);
    expect(enforceRateLimit).not.toHaveBeenCalled();
  });

  it("applies the workspace/user rate limit after authorization", async () => {
    await authorizeHunterOperation({ ...context, authorize: async () => true });
    expect(enforceRateLimit).toHaveBeenCalledWith({
      operation: "email_verification",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
  });
});
