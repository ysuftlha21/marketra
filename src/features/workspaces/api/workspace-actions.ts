"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/db/supabase-server";
import { createWorkspaceSchema } from "@/features/auth/schema/auth-schemas";
import {
  isReservedSlug,
  normalizeSlug,
  slugifyWorkspaceName,
  workspaceNameSchema,
} from "@/features/workspaces/domain/slug";
import { requireAuthContext, requireWorkspace, requireWorkspaceRole } from "@/lib/auth/session";

export async function createWorkspaceAction(formData: FormData) {
  const ctx = await requireAuthContext();
  const rawName = String(formData.get("name") ?? "");
  const rawSlug = String(formData.get("slug") ?? "");
  const slug = rawSlug ? normalizeSlug(rawSlug) : slugifyWorkspaceName(rawName);
  const parsed = createWorkspaceSchema.safeParse({ name: rawName, slug });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid workspace details" };
  }
  if (isReservedSlug(parsed.data.slug)) {
    return { error: "This workspace slug is reserved. Please choose another." };
  }
  const supabase = await createServerClient();
  const { error } = await supabase.rpc("create_workspace", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });
  if (error) {
    if (error.code === "23505") return { error: "This workspace slug is already taken." };
    return { error: "Could not create workspace. Please try again." };
  }
  void ctx;
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

export async function renameWorkspaceAction(formData: FormData) {
  const ws = await requireWorkspaceRole("admin");
  const name = String(formData.get("name") ?? "");
  const parsed = workspaceNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid workspace name" };
  }
  void ws;
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ name: parsed.data })
    .eq("id", ws.workspace.id);
  if (error) return { error: "Could not rename workspace." };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function switchWorkspaceAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  if (!workspaceId) return { error: "Missing workspace." };
  const { setActiveWorkspace } = await import("@/lib/auth/session");
  try {
    await setActiveWorkspace(workspaceId);
  } catch (err) {
    if (err instanceof Error && err.name === "AuthorizationError") return { error: "Not allowed." };
    return { error: "Could not switch workspace." };
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateMemberRoleAction(formData: FormData) {
  const ctx = await requireAuthContext();
  const ws = await requireWorkspaceRole("admin");
  const memberId = String(formData.get("userId") ?? "");
  const newRole = String(formData.get("role") ?? "");
  if (!memberId || !["admin", "member"].includes(newRole)) {
    return { error: "Invalid request." };
  }
  if (memberId === ctx.user.id) return { error: "Cannot change your own role." };
  if (memberId === ws.memberships.find((m) => m.role === "owner")?.userId) {
    return { error: "Cannot change the owner's role." };
  }
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("workspace_members")
    .update({ role: newRole as "admin" | "member" })
    .eq("workspace_id", ws.workspace.id)
    .eq("user_id", memberId);
  if (error) return { error: "Could not update member role." };
  revalidatePath("/dashboard/settings", "page");
  return { ok: true };
}

export async function leaveWorkspaceAction() {
  const ctx = await requireAuthContext();
  const ws = await requireWorkspace();
  if (ws.role === "owner") {
    return { error: "Owners cannot leave a workspace. Transfer ownership or delete it first." };
  }
  void ws;
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", ws.workspace.id)
    .eq("user_id", ctx.user.id);
  if (error) return { error: "Could not leave workspace." };
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
