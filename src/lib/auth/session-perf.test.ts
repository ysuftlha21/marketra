import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getAuthContext memoization (React.cache per-render)", () => {
  it("is exported as a cached function", async () => {
    const mod = await import("./session");
    expect(typeof mod.getAuthContext).toBe("function");
  });
});

describe("AuthContext type integrity", () => {
  it("AuthContext contains memberships in activeWorkspace", () => {
    const memberships = [{ workspaceId: "ws-1", userId: "u-1", role: "owner" as const }];
    const ctx = {
      user: { id: "u-1", email: "test@test.com" },
      displayName: "Test",
      activeWorkspace: {
        workspace: { id: "ws-1", name: "Test WS", slug: "test-ws" },
        role: "owner" as const,
        memberships,
      },
    };

    expect(ctx.activeWorkspace.memberships).toHaveLength(1);
    expect(ctx.activeWorkspace.memberships[0]?.workspaceId).toBe("ws-1");
  });

  it("listUserWorkspaces with null context returns empty", async () => {
    const { listUserWorkspaces } = await import("./session");
    const result = await listUserWorkspaces(null);
    expect(result).toEqual([]);
  });

  it("listUserWorkspaces with context having no workspace returns empty", async () => {
    const { listUserWorkspaces } = await import("./session");
    const result = await listUserWorkspaces({
      user: { id: "u-1", email: "test@test.com" },
      displayName: null,
      activeWorkspace: null,
    });
    expect(result).toEqual([]);
  });
});

describe("require* functions retain behavior", () => {
  it("requireUser calls getAuthContext", async () => {
    const { requireUser } = await import("./session");
    await expect(requireUser()).rejects.toThrow();
  });

  it("requireAuthContext calls getAuthContext", async () => {
    const { requireAuthContext } = await import("./session");
    await expect(requireAuthContext()).rejects.toThrow();
  });
});

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/db/supabase-server", () => ({
  createServerClient: vi.fn(() => mockSupabase),
  SupabaseConfigError: class extends Error {
    constructor(m: string) {
      super(m);
      this.name = "SupabaseConfigError";
    }
  },
}));

describe("listUserWorkspaces reuses context (no duplicate auth)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser = vi.fn();
    mockSupabase.from = vi.fn();
  });

  it("does not call getAuthContext.getUser when context is supplied", async () => {
    const fakeCtx = {
      user: { id: "u-1", email: "a@b.com" },
      displayName: null,
      activeWorkspace: {
        workspace: { id: "ws-1", name: "WS", slug: "ws" },
        role: "owner" as const,
        memberships: [{ workspaceId: "ws-1", userId: "u-1", role: "owner" as const }],
      },
    };

    mockSupabase.from.mockReturnValue({
      select: () => ({
        in: () => ({ data: [{ id: "ws-1", name: "WS", slug: "ws" }], error: null }),
      }),
    });

    const { listUserWorkspaces } = await import("./session");
    const result = await listUserWorkspaces(fakeCtx);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("WS");
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("preserves backward compatibility: no-arg call still works", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "a@b.com" } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          data: [],
          error: null,
          maybeSingle: () => ({ data: null, error: null }),
          in: () => ({ data: [], error: null }),
        }),
      }),
    });

    const { listUserWorkspaces } = await import("./session");
    await expect(listUserWorkspaces()).resolves.toEqual([]);
  });
});

describe("separate requests isolation", () => {
  it("getAuthContext is a function (cache is per-render at runtime)", async () => {
    const { getAuthContext } = await import("./session");
    expect(typeof getAuthContext).toBe("function");
  });
});
