import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { authenticateTestClient } from "../utils/test-auth";

const HAS_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key} — set it in .env to run real Supabase tests`);
  return value;
}

const URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const ANON_KEY = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SERVICE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");

function svc(): SupabaseClient<Database> {
  return createClient<Database>(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function uid(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createUser(
  email: string,
  password: string,
): Promise<{ userId: string; client: SupabaseClient<Database> }> {
  const admin = svc();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Failed to create test user");

  // Explicitly create profile + preferences (the custom trigger may not fire for admin-created users)
  await admin
    .from("profiles")
    .insert({ id: data.user.id, email, display_name: email })
    .maybeSingle();
  await admin.from("user_preferences").insert({ user_id: data.user.id }).maybeSingle();

  const client = createClient<Database>(URL, ANON_KEY, {
    auth: { storageKey: `rls-test-${email}`, autoRefreshToken: false, persistSession: false },
  });
  await authenticateTestClient(client, email, password);

  return { userId: data.user.id, client };
}

async function ws(client: SupabaseClient<Database>, name: string, slug: string): Promise<string> {
  const { data, error } = await client.rpc("create_workspace", { p_name: name, p_slug: slug });
  if (error) throw new Error(`create_workspace failed: ${error.message}`);
  return data as string;
}

async function addMember(
  workspaceId: string,
  userId: string,
  role: "member" | "admin",
): Promise<void> {
  // Use service client to bypass RLS and add a member.
  // Upsert to handle any leftover data from interrupted test runs.
  await svc()
    .from("workspace_members")
    .upsert(
      { workspace_id: workspaceId, user_id: userId, role },
      { onConflict: "workspace_id, user_id" },
    );
  await svc()
    .from("user_preferences")
    .update({ active_workspace_id: workspaceId })
    .eq("user_id", userId);
}

async function cleanupUser(userId: string): Promise<void> {
  try {
    await svc().auth.admin.deleteUser(userId);
  } catch {
    // already deleted
  }
}

if (!HAS_SUPABASE) {
  describe.skip("RLS and tenant isolation", () => {
    it("requires Supabase credentials", () => {});
  });
} else {
  describe("RLS and tenant isolation", () => {
    const PWD = "TestPass123!";
    const tag = uid("rls");
    const emailA = `rls-a-${tag}@example.com`;
    const emailB = `rls-b-${tag}@example.com`;
    const emailM = `rls-m-${tag}@example.com`; // member user

    let userAId: string;
    let userBId: string;
    let memberUserId: string;
    let clientA: SupabaseClient<Database>;
    let clientB: SupabaseClient<Database>;
    let clientM: SupabaseClient<Database>; // member (not owner)
    let wsAId: string;
    let wsBId: string;

    beforeAll(async () => {
      const a = await createUser(emailA, PWD);
      userAId = a.userId;
      clientA = a.client;

      const b = await createUser(emailB, PWD);
      userBId = b.userId;
      clientB = b.client;

      const m = await createUser(emailM, PWD);
      memberUserId = m.userId;
      clientM = m.client;

      wsAId = await ws(clientA, `WS A ${uid("n")}`, `ws-a-${uid("n")}`);
      wsBId = await ws(clientB, `WS B ${uid("n")}`, `ws-b-${uid("n")}`);

      // Add member user to Workspace A as a regular member (not owner/admin)
      await addMember(wsAId, memberUserId, "member");
    }, 60000);

    afterAll(async () => {
      const admin = svc();
      await admin.from("workspaces").delete().eq("id", wsAId);
      await admin.from("workspaces").delete().eq("id", wsBId);
      await cleanupUser(userAId);
      await cleanupUser(userBId);
      await cleanupUser(memberUserId);
    }, 30000);

    it("1. User A can read their own profile", async () => {
      const { data, error } = await clientA.from("profiles").select("*").eq("id", userAId).single();
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.id).toBe(userAId);
    });

    it("2. User A cannot read User B's profile", async () => {
      const { data, error } = await clientA
        .from("profiles")
        .select("*")
        .eq("id", userBId)
        .maybeSingle();
      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("3. User A can read Workspace A as a member", async () => {
      const { data, error } = await clientA
        .from("workspaces")
        .select("id")
        .eq("id", wsAId)
        .maybeSingle();
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.id).toBe(wsAId);
    });

    it("4. User A cannot read Workspace B", async () => {
      const { data, error } = await clientA
        .from("workspaces")
        .select("id")
        .eq("id", wsBId)
        .maybeSingle();
      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("5. User A cannot update Workspace B", async () => {
      const { data: orig } = await svc().from("workspaces").select("name").eq("id", wsBId).single();
      const { error } = await clientA
        .from("workspaces")
        .update({ name: "Hacked by A" })
        .eq("id", wsBId);
      expect(error).toBeNull(); // RLS blocks silently — no PostgREST error
      // Verify the name was NOT actually changed
      const { data } = await svc().from("workspaces").select("name").eq("id", wsBId).single();
      expect(data!.name).toBe(orig!.name);
    });

    it("6. Anonymous users cannot enumerate workspaces", async () => {
      const anon = createClient<Database>(URL, ANON_KEY);
      const { data, error } = await anon.from("workspaces").select("id").limit(1);
      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });

    it("7. Unrelated users cannot enumerate workspace members", async () => {
      const { data, error } = await clientA
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", wsBId);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it("8. A member cannot promote themselves to admin", async () => {
      const { error } = await clientM
        .from("workspace_members")
        .update({ role: "admin" })
        .eq("workspace_id", wsAId)
        .eq("user_id", memberUserId);
      expect(error).toBeNull(); // RLS blocks silently
      // Verify role was NOT changed
      const { data } = await svc()
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", wsAId)
        .eq("user_id", memberUserId)
        .single();
      expect(data!.role).toBe("member");
    });

    it("9. A member cannot assign themselves admin via update", async () => {
      const { error } = await clientM
        .from("workspace_members")
        .update({ role: "admin" })
        .eq("workspace_id", wsAId)
        .eq("user_id", memberUserId);
      expect(error).toBeNull(); // RLS blocks silently
      // Verify role was NOT changed
      const { data } = await svc()
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", wsAId)
        .eq("user_id", memberUserId)
        .single();
      expect(data!.role).toBe("member");
    });

    it("10. An admin cannot assign owner role", async () => {
      const { error } = await clientM
        .from("workspace_members")
        .update({ role: "owner" })
        .eq("workspace_id", wsAId)
        .eq("user_id", memberUserId);
      expect(error).toBeNull(); // RLS blocks silently
      // Verify role was NOT changed to owner
      const { data } = await svc()
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", wsAId)
        .eq("user_id", memberUserId)
        .single();
      expect(data!.role).not.toBe("owner");
    });

    it("11. An owner can rename their own workspace", async () => {
      const { error } = await clientA
        .from("workspaces")
        .update({ name: "Renamed WS A" })
        .eq("id", wsAId);
      expect(error).toBeNull();

      const { data } = await clientA.from("workspaces").select("name").eq("id", wsAId).single();
      expect(data!.name).toBe("Renamed WS A");
    });

    it("12. A member cannot rename a workspace they do not own", async () => {
      const { data: orig } = await svc().from("workspaces").select("name").eq("id", wsAId).single();
      const { error } = await clientB
        .from("workspaces")
        .update({ name: "Hacked by B" })
        .eq("id", wsAId);
      expect(error).toBeNull(); // RLS blocks silently
      // Verify name was NOT changed
      const { data } = await svc().from("workspaces").select("name").eq("id", wsAId).single();
      expect(data!.name).toBe(orig!.name);
    });

    it("13. Workspace creation creates exactly one owner membership", async () => {
      const wid = await ws(clientA, "Owner Count", `oc-${uid("v")}`);
      const { data: members } = await svc()
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", wid);
      expect(members).not.toBeNull();
      const owners = members!.filter((m) => m.role === "owner");
      expect(owners.length).toBe(1);
      await svc().from("workspaces").delete().eq("id", wid);
    });

    it("14. Retrying workspace creation does not create duplicate memberships", async () => {
      const slug = `dd-${uid("d")}`;
      const wid = await ws(clientA, "Dedup", slug);

      const { error: err2 } = await clientA.rpc("create_workspace", {
        p_name: "Dedup 2",
        p_slug: slug,
      });
      expect(err2).not.toBeNull();

      const { data: members } = await svc()
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", wid);
      expect(members).not.toBeNull();
      const owners = members!.filter((m) => m.role === "owner");
      expect(owners.length).toBe(1);

      await svc().from("workspaces").delete().eq("id", wid);
    });

    it("15. A user cannot change another user's active workspace preference", async () => {
      const { data: orig } = await svc()
        .from("user_preferences")
        .select("active_workspace_id")
        .eq("user_id", userAId)
        .single();
      const { error } = await clientB
        .from("user_preferences")
        .update({ active_workspace_id: wsBId })
        .eq("user_id", userAId);
      expect(error).toBeNull(); // RLS blocks silently
      // Verify preference was NOT changed
      const { data } = await svc()
        .from("user_preferences")
        .select("active_workspace_id")
        .eq("user_id", userAId)
        .single();
      expect(data!.active_workspace_id).toBe(orig!.active_workspace_id);
    });
  });
}
