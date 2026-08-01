import { KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCrmStagesOrdered } from "@/config/crm-stages";
import Link from "next/link";
import { resolveAuthenticatedProjectContext } from "@/features/projects/services/project-context-service";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "CRM" };

export default async function CrmPage() {
  const stages = getCrmStagesOrdered();
  const context = await resolveAuthenticatedProjectContext();
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="CRM"
        title="Lightweight CRM"
        description="Track companies and activities across your pipeline."
      />
      <EmptyState
        icon={KanbanSquare}
        title={
          context.counts.drafts > 0 ? "No campaign activity yet" : "Create an outreach draft first"
        }
        description={
          context.counts.drafts > 0
            ? "Approved outreach will appear here when campaign operations begin."
            : "Campaign setup starts from a reviewed outreach draft, not from creating another ICP."
        }
        action={
          <Link
            href={context.counts.drafts > 0 ? "/dashboard/outreach" : "/dashboard/outreach"}
            className={buttonVariants()}
          >
            {context.counts.drafts > 0 ? "Review outreach" : "Prepare outreach"}
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>CRM stages</CardTitle>
          <CardDescription>The pipeline structure used in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {stages.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <Badge variant="outline" tone={s.color === "neutral" ? "neutral" : s.color}>
                  {i + 1}. {s.name}
                </Badge>
                {i < stages.length - 1 ? <span className="text-muted-foreground">›</span> : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
