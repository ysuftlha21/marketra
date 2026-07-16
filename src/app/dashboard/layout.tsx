import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthContext, listUserWorkspaces } from "@/lib/auth/session";
import { AppShell, type AppShellContext } from "@/components/dashboard/app-shell";
import type { WorkspaceRole } from "@/features/workspaces/domain/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Marketra" },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();

  if (!ctx) redirect("/sign-in?next=/dashboard");
  if (!ctx.activeWorkspace) redirect("/onboarding");

  const workspaces = await listUserWorkspaces(ctx);
  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get("sidebar:state")?.value === "true";

  const shellContext: AppShellContext = {
    user: {
      email: ctx.user.email ?? "",
      displayName: ctx.displayName ?? ctx.user.email ?? "",
    },
    activeWorkspace: {
      id: ctx.activeWorkspace.workspace.id,
      name: ctx.activeWorkspace.workspace.name,
      slug: ctx.activeWorkspace.workspace.slug,
      role: ctx.activeWorkspace.role as WorkspaceRole,
    },
    workspaces: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      role: w.role as WorkspaceRole,
    })),
  };

  return (
    <AppShell context={shellContext} sidebarCollapsed={sidebarCollapsed}>
      {children}
    </AppShell>
  );
}
