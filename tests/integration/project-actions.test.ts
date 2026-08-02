import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import * as ProjectService from "@/features/projects/services/project-service";
import { createProjectAction } from "@/features/projects/api/project-actions";

// Mock server side environment
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => {
  return {
    cookies: () => ({
      getAll: () => [],
      set: () => {},
    }),
  };
});

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function svc(): SupabaseClient<Database> {
  return createClient<Database>(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function uid(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const _cleanupIds: string[] = [];
let ownerId: string;
let ownerEmail: string;

async function setupUser(): Promise<void> {
  const admin = svc();
  const email = `svc-${uid("u")}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "TestPass123!",
    email_confirm: true,
  });
  if (error) throw error;
  ownerId = data.user!.id;
  ownerEmail = email;
  _cleanupIds.push(ownerId);
  await admin.from("profiles").insert({ id: ownerId, email }).maybeSingle();
  await admin.from("user_preferences").insert({ user_id: ownerId }).maybeSingle();

  // Create workspace manually
  const { data: ws, error: wsError } = await admin
    .from("workspaces")
    .insert({
      created_by: ownerId,
      name: "Service Workspace",
      slug: uid("ws"),
    })
    .select()
    .single();
  if (wsError) throw wsError;

  await admin.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: ownerId,
    role: "owner",
  });

  _mockActiveWorkspace = {
    workspace: { id: ws.id },
    role: "owner",
  };
}

let _mockActiveWorkspace: { workspace: { id: string }; role: string } | null = null;

// Mock auth context to bypass actual cookie handling in server actions
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    getAuthContext: async () => {
      return {
        user: { id: ownerId, email: ownerEmail },
        activeWorkspace: _mockActiveWorkspace,
      };
    },
  };
});

vi.mock("@/lib/db/supabase-server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/supabase-server")>();
  return {
    ...actual,
    createServerClient: async () => {
      return svc();
    },
  };
});

describe("Project Server Actions (Service)", () => {
  beforeAll(async () => {
    await setupUser();
  });

  afterAll(async () => {
    const admin = svc();
    for (const id of _cleanupIds) await admin.auth.admin.deleteUser(id).catch(() => {});
  });

  it("real project creation action succeeds for an authorized user", async () => {
    const formData = new FormData();
    formData.append("name", "Action Project");
    formData.append("slug", uid("act"));
    formData.append(
      "productDescription",
      "Server Action Description that is long enough to pass zod",
    );
    formData.append("preferredLanguage", "en");
    formData.append("currentMarkets", JSON.stringify(["TR"]));
    formData.append("targetExpansionMarkets", JSON.stringify(["US", "US"]));

    const result = await createProjectAction(formData);

    // Ensure success
    expect((result as { error?: string }).error).toBeUndefined();
    expect((result as { id?: string }).id).toBeDefined();
    expect((result as { name?: string }).name).toBe("Action Project");
    const projectId = (result as { id: string }).id;
    const { data: targets } = await svc()
      .from("project_target_countries")
      .select("country_code")
      .eq("project_id", projectId);
    expect(targets).toEqual([{ country_code: "US" }]);
  });

  it("rejects malformed country arrays without leaking parser details", async () => {
    const formData = new FormData();
    formData.append("name", "Malformed markets");
    formData.append(
      "productDescription",
      "A sufficiently detailed product description for validation",
    );
    formData.append("targetExpansionMarkets", "not-json");
    const result = await createProjectAction(formData);
    expect((result as { error?: string }).error).toBeDefined();
    expect((result as { error?: string }).error).not.toMatch(/JSON|Unexpected token/i);
  });

  it("missing membership maps to a typed safe error", async () => {
    // Clear the active workspace to simulate missing membership
    const prevMock = _mockActiveWorkspace;
    _mockActiveWorkspace = null;

    const formData = new FormData();
    formData.append("name", "Action Project 2");
    formData.append("slug", uid("act2"));
    formData.append("productDescription", "Should Fail Because of no workspace but long enough");

    const result = await createProjectAction(formData);

    // Expect safe typed error
    expect((result as { error?: string }).error).toBeDefined();
    expect((result as { error?: string }).error).toBe(
      "You do not have permission to perform this action.",
    );

    // Restore active workspace for next tests
    _mockActiveWorkspace = prevMock;
  });

  it("database permission errors are not leaked raw to the UI", async () => {
    // Spy on the service to throw a raw Error
    const spy = vi
      .spyOn(ProjectService, "createProjectService")
      .mockRejectedValueOnce(new Error("duplicate key value violates unique constraint"));

    const fd = new FormData();
    fd.append("name", "Proj DBMask");
    fd.append("slug", uid("mask"));
    fd.append("productDescription", "Description is long enough");

    const result = await createProjectAction(fd);

    expect((result as { error?: string }).error).toBeDefined();
    expect((result as { error?: string }).error).not.toContain(
      "duplicate key value violates unique constraint",
    );
    expect((result as { error?: string }).error).toBe("Could not create project. Try again.");

    spy.mockRestore();
  });
});
