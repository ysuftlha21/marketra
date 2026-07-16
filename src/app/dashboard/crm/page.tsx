import { KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCrmStagesOrdered } from "@/config/crm-stages";

export const metadata = { title: "CRM" };

export default function CrmPage() {
  const stages = getCrmStagesOrdered();
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="CRM"
        title="Lightweight CRM"
        description="Track companies and activities across your pipeline."
      />
      <EmptyState
        icon={KanbanSquare}
        title="Your pipeline is empty"
        description="Companies and activities will move through these stages once discovery and outreach start."
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
