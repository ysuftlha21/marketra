import Link from "next/link";
import { Megaphone } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { resolveAuthenticatedProjectContext } from "@/features/projects/services/project-context-service";
import { listWorkspaceOutreachDrafts } from "@/features/outreach/repository/outreach-repository";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  const context = await resolveAuthenticatedProjectContext();
  const drafts =
    context.workspaceId && context.project
      ? await listWorkspaceOutreachDrafts(context.workspaceId, {
          projectId: context.project.id,
          page: 1,
          pageSize: 50,
        })
      : { rows: [], count: 0 };
  const approved = drafts.rows.filter((draft) => draft.status === "approved");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Campaigns"
        title="Campaign planning"
        description="Group reviewed outreach drafts without implying that automated sending is enabled."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Outreach drafts" value={drafts.count} />
        <Metric label="Approved for planning" value={approved.length} />
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Mailbox</p>
            <div className="mt-2">
              <Badge variant="outline" tone="warning">
                Not connected
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="font-semibold">Sending unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No mailbox or cold-email provider is enabled. Drafts remain planning records and cannot
            be sent from Marketra.
          </p>
        </CardContent>
      </Card>

      {drafts.rows.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={context.project ? "Prepare outreach first" : "Create a project first"}
          description={
            context.project
              ? "Create and review an outreach draft before planning a campaign."
              : "Campaign planning is scoped to an authenticated project."
          }
          action={
            <Link
              href={context.project ? "/dashboard/outreach" : "/dashboard/projects/new"}
              className={buttonVariants()}
            >
              {context.project ? "Prepare outreach" : "Create project"}
            </Link>
          }
        />
      ) : approved.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Review outreach drafts"
          description="Drafts exist, but none are approved for campaign planning yet."
          action={
            <Link href="/dashboard/outreach" className={buttonVariants()}>
              Review drafts
            </Link>
          }
        />
      ) : (
        <div className="space-y-3" aria-label="Campaign planning drafts">
          {approved.map((draft) => {
            const row = draft as typeof draft & {
              companies?: { canonical_name?: string };
              company_decision_roles?: { role_title?: string };
            };
            return (
              <Card key={draft.id}>
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {row.companies?.canonical_name ?? "Approved outreach"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {row.company_decision_roles?.role_title ?? "Decision maker"} · {draft.channel}{" "}
                      · {draft.language}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" tone="success">
                      Approved
                    </Badge>
                    <Link
                      href="/dashboard/outreach"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Open draft
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
