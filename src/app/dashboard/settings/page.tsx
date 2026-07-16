import { createServerClient } from "@/lib/db/supabase-server";
import { requireAuthContext, requireWorkspace } from "@/lib/auth/session";
import { canManageWorkspaceSettings } from "@/features/workspaces/domain/roles";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RenameWorkspaceForm } from "@/features/workspaces/components/rename-workspace-form";
import { MembersList, type MemberRow } from "@/features/workspaces/components/members-list";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireAuthContext();
  const ws = await requireWorkspace();
  const canManage = canManageWorkspaceSettings(ws.role);

  const supabase = await createServerClient();
  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", ws.workspace.id);
  const rows = (memberRows ?? []) as { user_id: string; role: "owner" | "admin" | "member" }[];
  const userIds = rows.map((r) => r.user_id);
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", userIds);
  const profiles = (profileRows ?? []) as {
    id: string;
    email: string | null;
    display_name: string | null;
  }[];

  const currentUserId = ctx.user.id;
  const members: MemberRow[] = rows
    .map((r) => {
      const p = profiles.find((pp) => pp.id === r.user_id);
      return {
        userId: r.user_id,
        displayName: p?.display_name ?? null,
        email: p?.email ?? null,
        role: r.role,
        isSelf: r.user_id === currentUserId,
      };
    })
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage your workspace, members, and configuration."
        actions={
          <Badge variant="outline" tone={ws.role === "owner" ? "primary" : "neutral"}>
            {ws.role}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>
              {canManage
                ? "Rename your workspace."
                : "Only owners and admins can rename the workspace."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManage ? (
              <RenameWorkspaceForm initialName={ws.workspace.name} />
            ) : (
              <p className="text-sm text-muted-foreground">{ws.workspace.name}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace slug</CardTitle>
            <CardDescription>
              Used as a stable identifier. Slug changes are not supported yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm text-foreground">{ws.workspace.slug}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {canManage
              ? "Manage roles of workspace members. Ownership cannot be transferred here yet."
              : "Workspace members are listed below."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <EmptyState title="No members" description="This workspace has no members yet." />
          ) : (
            <MembersList members={members} canManage={canManage} currentUserId={currentUserId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
