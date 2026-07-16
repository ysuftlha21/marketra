import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { authenticateTestClient } from "../utils/test-auth";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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

async function signUp(
  email: string,
  password: string,
): Promise<{ id: string; client: SupabaseClient<Database> }> {
  const admin = svc();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  _cleanupIds.push(data.user!.id);
  await admin.from("profiles").insert({ id: data.user!.id, email }).maybeSingle();
  await admin.from("user_preferences").insert({ user_id: data.user!.id }).maybeSingle();

  const client = createClient<Database>(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await authenticateTestClient(client, email, password);
  return { id: data.user!.id, client };
}

describe("Project permissions (Anon-client DB tests)", () => {
  const PWD = "TestPass123!";
  let owner: { id: string; client: SupabaseClient<Database> };
  let adminUser: { id: string; client: SupabaseClient<Database> };
  let memberUser: { id: string; client: SupabaseClient<Database> };
  let outsider: { id: string; client: SupabaseClient<Database> };
  let wsId: string;

  beforeAll(async () => {
    owner = await signUp(`owner-${uid("u")}@example.com`, PWD);
    adminUser = await signUp(`admin-${uid("u")}@example.com`, PWD);
    memberUser = await signUp(`member-${uid("u")}@example.com`, PWD);
    outsider = await signUp(`outsider-${uid("u")}@example.com`, PWD);

    // Setup Workspace
    const { data: wsData, error: wsError } = await owner.client.rpc("create_workspace", {
      p_name: "Test Workspace",
      p_slug: uid("ws"),
    });
    if (wsError) throw wsError;
    wsId = wsData as string;

    // Add users to workspace
    const s = svc();
    await s.from("workspace_members").insert([
      { workspace_id: wsId, user_id: adminUser.id, role: "admin" },
      { workspace_id: wsId, user_id: memberUser.id, role: "member" },
    ]);
  });

  afterAll(async () => {
    const s = svc();
    for (const id of _cleanupIds) {
      await s.auth.admin.deleteUser(id).catch(() => {});
    }
  });

  it("owner can create a project", async () => {
    const { data, error } = await owner.client
      .from("projects")
      .insert({
        workspace_id: wsId,
        created_by: owner.id,
        name: "Owner Project",
        slug: uid("oproj"),
        product_description: "Desc",
        current_markets: [],
        preferred_language: "en",
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.workspace_id).toBe(wsId);
  });

  it("admin can create a project if RBAC permits", async () => {
    const { data, error } = await adminUser.client
      .from("projects")
      .insert({
        workspace_id: wsId,
        created_by: adminUser.id,
        name: "Admin Project",
        slug: uid("aproj"),
        product_description: "Desc",
        current_markets: [],
        preferred_language: "en",
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.workspace_id).toBe(wsId);
  });

  it("member behavior matches current RBAC (can create)", async () => {
    // Check if member is allowed (currently yes in projects_insert policy: role in ('owner', 'admin', 'member'))
    const { data, error } = await memberUser.client
      .from("projects")
      .insert({
        workspace_id: wsId,
        created_by: memberUser.id,
        name: "Member Project",
        slug: uid("mproj"),
        product_description: "Desc",
        current_markets: [],
        preferred_language: "en",
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it("outsider cannot create a project", async () => {
    const { data, error } = await outsider.client
      .from("projects")
      .insert({
        workspace_id: wsId,
        created_by: outsider.id,
        name: "Outsider Project",
        slug: uid("outproj"),
        product_description: "Desc",
        current_markets: [],
        preferred_language: "en",
      })
      .select()
      .maybeSingle();
    if (error) {
      expect(error.code).toBe("42501");
    } else {
      expect(data).toBeNull();
    }
  });

  it("forged workspace_id is rejected", async () => {
    const fakeWsId = "00000000-0000-0000-0000-000000000000";
    const { data, error } = await owner.client
      .from("projects")
      .insert({
        workspace_id: fakeWsId,
        created_by: owner.id,
        name: "Fake Project",
        slug: uid("fproj"),
        product_description: "Desc",
        current_markets: [],
        preferred_language: "en",
      })
      .select()
      .maybeSingle();
    if (error) {
      expect(error.code).toBe("42501");
    } else {
      expect(data).toBeNull();
    }
  });

  it("authorized user can create product_analysis_runs", async () => {
    // First need a project
    const { data: p } = await owner.client
      .from("projects")
      .insert({
        workspace_id: wsId,
        created_by: owner.id,
        name: "Analysis Project",
        slug: uid("anaproj"),
        product_description: "Desc",
        current_markets: [],
        preferred_language: "en",
      })
      .select()
      .single();
    expect(p).toBeDefined();

    const { data, error } = await owner.client
      .from("product_analysis_runs")
      .insert({
        workspace_id: wsId,
        project_id: p!.id,
        requested_by: owner.id,
        provider: "mock",
        model: "mock",
        prompt_version: "v1",
        input_snapshot: {},
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.workspace_id).toBe(wsId);
    expect(data!.project_id).toBe(p!.id);
  });

  it("outsider cannot create product_analysis_runs", async () => {
    const { data: p } = await owner.client
      .from("projects")
      .insert({
        workspace_id: wsId,
        created_by: owner.id,
        name: "Analysis Project 2",
        slug: uid("anaproj2"),
        product_description: "Desc",
        current_markets: [],
        preferred_language: "en",
      })
      .select()
      .single();

    const { data: outData, error } = await outsider.client
      .from("product_analysis_runs")
      .insert({
        workspace_id: wsId,
        project_id: p!.id,
        requested_by: outsider.id,
        provider: "mock",
        model: "mock",
        prompt_version: "v1",
        input_snapshot: {},
      })
      .select()
      .maybeSingle();
    if (error) {
      expect(error.code).toBe("42501");
    } else {
      expect(outData).toBeNull();
    }
  });

  it("project and analysis remain workspace-isolated", async () => {
    // unused svc() removed
    const { data: ws2Data } = await outsider.client.rpc("create_workspace", {
      p_name: "Outsider Workspace",
      p_slug: uid("ws2"),
    });
    const ws2Id = ws2Data as string;

    const { data: p2 } = await outsider.client
      .from("projects")
      .insert({
        workspace_id: ws2Id,
        created_by: outsider.id,
        name: "W2 Project",
        slug: uid("w2proj"),
        product_description: "Desc",
        current_markets: [],
        preferred_language: "en",
      })
      .select()
      .single();

    // Owner tries to select projects from ws2
    const { data: selected } = await owner.client
      .from("projects")
      .select()
      .eq("workspace_id", ws2Id);
    expect(selected ?? []).toHaveLength(0); // RLS hides it

    // Owner tries to cross-insert into ws2's project
    const { error: crossError, data: crossData } = await owner.client
      .from("product_analysis_runs")
      .insert({
        workspace_id: ws2Id, // Forged
        project_id: p2!.id,
        requested_by: owner.id,
        provider: "mock",
        model: "mock",
        prompt_version: "v1",
        input_snapshot: {},
      })
      .select()
      .maybeSingle();
    if (crossError) {
      expect(crossError.code).toBe("42501");
    } else {
      expect(crossData).toBeNull();
    }
  });
});
