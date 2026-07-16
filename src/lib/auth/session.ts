import { cache } from "react";
import { createServerClient, SupabaseConfigError } from "@/lib/db/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import type { WorkspaceRole } from "@/features/workspaces/domain/roles";
import { perfStart, perfEnd, perfDump } from "./perf";

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface WorkspaceMembership {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

export interface ActiveWorkspace {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  role: WorkspaceRole;
  memberships: WorkspaceMembership[];
}

export interface AuthContext {
  user: AuthUser;
  displayName: string | null;
  activeWorkspace: ActiveWorkspace | null;
}

export class AuthorizationError extends Error {
  readonly code: "unauthenticated" | "forbidden" | "no_workspace";
  constructor(code: AuthorizationError["code"], message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
  }
}

export class AuthInfrastructureError extends Error {
  override readonly cause: "config" | "network" | "database";
  constructor(cause: AuthInfrastructureError["cause"], message: string) {
    super(message);
    this.name = "AuthInfrastructureError";
    this.cause = cause;
  }
}

async function loadAuthContext(supabase: SupabaseClient<Database>): Promise<AuthContext | null> {
  const t0 = perfStart("auth.getUser");
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  perfEnd("auth.getUser", t0);
  if (userError) throw userError;
  if (!user) return null;

  const t1 = perfStart("loadAuthContext.parallel");
  const [profile, memberships, prefs] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.from("workspace_members").select("workspace_id, user_id, role").eq("user_id", user.id),
    supabase
      .from("user_preferences")
      .select("active_workspace_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  perfEnd("loadAuthContext.parallel", t1);

  const membershipRows = (memberships.data ?? []) as {
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
  }[];
  const workspaceIds = membershipRows.map((m) => m.workspace_id);

  let workspaceRows: { id: string; name: string; slug: string }[] = [];
  if (workspaceIds.length > 0) {
    const t2 = perfStart("loadAuthContext.workspaces");
    const { data } = await supabase
      .from("workspaces")
      .select("id, name, slug")
      .in("id", workspaceIds);
    perfEnd("loadAuthContext.workspaces", t2);
    workspaceRows = (data ?? []) as { id: string; name: string; slug: string }[];
  }

  const prefsData = prefs.data as { active_workspace_id: string | null } | null;
  const activeWorkspaceId = prefsData?.active_workspace_id ?? null;
  const membershipsOut: WorkspaceMembership[] = membershipRows.map((m) => ({
    workspaceId: m.workspace_id,
    userId: m.user_id,
    role: m.role,
  }));

  const active =
    activeWorkspaceId && workspaceRows.some((w) => w.id === activeWorkspaceId)
      ? workspaceRows.find((w) => w.id === activeWorkspaceId)!
      : (workspaceRows[0] ?? null);

  const profileData = profile.data as { display_name: string | null } | null;

  const perfOutput = perfDump();
  if (perfOutput) console.log(perfOutput);

  return {
    user: { id: user.id, email: user.email ?? null },
    displayName: profileData?.display_name ?? null,
    activeWorkspace: active
      ? {
          workspace: active,
          role: membershipRows.find((m) => m.workspace_id === active.id)?.role ?? "member",
          memberships: membershipsOut,
        }
      : null,
  };
}

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  let supabase: SupabaseClient<Database>;
  try {
    supabase = await createServerClient();
  } catch (err) {
    if (err instanceof SupabaseConfigError) {
      throw new AuthInfrastructureError("config", err.message);
    }
    throw err;
  }
  try {
    const t0 = perfStart("getAuthContext.total");
    const result = await loadAuthContext(supabase);
    perfEnd("getAuthContext.total", t0);
    const perfOutput = perfDump();
    if (perfOutput) console.log(perfOutput);
    return result;
  } catch (err) {
    if (err instanceof AuthorizationError) throw err;
    if (err && typeof err === "object" && "__isAuthError" in err) {
      return null;
    }
    throw err;
  }
});

export async function requireUser(): Promise<AuthUser> {
  const ctx = await getAuthContext();
  if (!ctx) throw new AuthorizationError("unauthenticated", "Sign in to continue.");
  return ctx.user;
}

export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new AuthorizationError("unauthenticated", "Sign in to continue.");
  return ctx;
}

export async function requireWorkspace(): Promise<ActiveWorkspace> {
  const ctx = await requireAuthContext();
  if (!ctx.activeWorkspace)
    throw new AuthorizationError("no_workspace", "Create a workspace to continue.");
  return ctx.activeWorkspace;
}

export async function requireWorkspaceRole(role: "owner" | "admin"): Promise<ActiveWorkspace> {
  const ws = await requireWorkspace();
  if (role === "owner" && ws.role !== "owner") {
    throw new AuthorizationError("forbidden", "Only the workspace owner may perform this action.");
  }
  if (role === "admin" && !(ws.role === "owner" || ws.role === "admin")) {
    throw new AuthorizationError("forbidden", "You do not have permission to perform this action.");
  }
  return ws;
}

export async function listUserWorkspaces(
  existingContext?: AuthContext | null,
): Promise<{ id: string; name: string; slug: string; role: WorkspaceRole }[]> {
  const ctx = existingContext !== undefined ? existingContext : await getAuthContext();
  if (!ctx?.activeWorkspace) return [];

  const memberships = ctx.activeWorkspace.memberships;
  const workspaceIds = memberships.map((m) => m.workspaceId);
  if (workspaceIds.length === 0) return [];

  const t0 = perfStart("listUserWorkspaces.workspaces");
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .in("id", workspaceIds);
  perfEnd("listUserWorkspaces.workspaces", t0);
  const perfOutput = perfDump();
  if (perfOutput) console.log(perfOutput);

  const wsRows = (data ?? []) as { id: string; name: string; slug: string }[];
  return wsRows.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    role: memberships.find((m) => m.workspaceId === w.id)?.role ?? "member",
  }));
}

export async function setActiveWorkspace(workspaceId: string): Promise<void> {
  const ctx = await requireAuthContext();
  const isMember = ctx.activeWorkspace!.memberships.some((m) => m.workspaceId === workspaceId);
  if (!isMember)
    throw new AuthorizationError("forbidden", "You are not a member of this workspace.");
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("user_preferences")
    .update({ active_workspace_id: workspaceId })
    .eq("user_id", ctx.user.id);
  if (error) throw new Error("Could not switch workspace.");
}
