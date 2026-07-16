import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanTestFixtures, resolveE2EUsersAndWorkspaces } from "../utils/fixture-cleanup";

describe("Test Fixture Cleanup Utility", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("fails if NODE_ENV is not test", async () => {
    process.env.NODE_ENV = "development";
    await expect(cleanTestFixtures()).rejects.toThrow(
      "Fixture cleanup aborted: NODE_ENV is not 'test'",
    );
  });

  it("fails if E2E_TEST_MODE is not true", async () => {
    process.env.NODE_ENV = "test";
    process.env.E2E_TEST_MODE = "false";
    await expect(cleanTestFixtures()).rejects.toThrow(
      "Fixture cleanup aborted: E2E_TEST_MODE is not 'true'",
    );
  });

  it("fails if URL is invalid HTTPS", async () => {
    process.env.NODE_ENV = "test";
    process.env.E2E_TEST_MODE = "true";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    await expect(cleanTestFixtures()).rejects.toThrow(
      "Fixture cleanup aborted: Supabase URL is not valid HTTPS",
    );
  });

  it("fails if URL does not contain approved project ref", async () => {
    process.env.NODE_ENV = "test";
    process.env.E2E_TEST_MODE = "true";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://wrongproject.supabase.co";
    await expect(cleanTestFixtures()).rejects.toThrow(
      "Fixture cleanup aborted: Parsed project reference does not exactly match approved test-project reference",
    );
  });

  it("resolves users correctly without duplicates", async () => {
    const mockSupabase = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [
                { id: "u1", email: "desktop@example.com" },
                { id: "u2", email: "mobile@example.com" },
              ],
            },
            error: null,
          }),
        },
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: "w1", name: "E2E Workspace Desktop", slug: "desk", created_by: "u1" }],
            error: null,
          }),
        }),
      }),
    };

    // The second call for mobile
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: "w1", name: "E2E Workspace Desktop", slug: "desk", created_by: "u1" }],
            error: null,
          }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: "w2", name: "E2E Workspace Mobile", slug: "mob", created_by: "u2" }],
            error: null,
          }),
        }),
      });

    const res = await resolveE2EUsersAndWorkspaces(
      mockSupabase,
      "desktop@example.com",
      "mobile@example.com",
    );
    expect(res.desktopUserId).toBe("u1");
    expect(res.mobileUserId).toBe("u2");
    expect(res.desktopWorkspaceId).toBe("w1");
    expect(res.mobileWorkspaceId).toBe("w2");
  });
});
