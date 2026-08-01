import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";
import { resolveAuthenticatedProjectContext } from "@/features/projects/services/project-context-service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Analytics" };
export default async function AnalyticsPage() {
  const context = await resolveAuthenticatedProjectContext();
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="Project performance"
        description={
          context.project
            ? `Activity for ${context.project.name}.`
            : "Activity for the active project."
        }
      />
      <EmptyState
        icon={ChartNoAxesCombined}
        title="No activity yet"
        description="Analytics will populate as discovery, buyer, and outreach activity is recorded."
        action={
          <Link
            href={context.project ? "/dashboard/companies" : "/dashboard/projects/new"}
            className={buttonVariants()}
          >
            {context.project ? "Start company discovery" : "Create project"}
          </Link>
        }
      />
    </div>
  );
}
