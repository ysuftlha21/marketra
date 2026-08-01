import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe } from "lucide-react";
import { resolveAuthenticatedProjectContext } from "@/features/projects/services/project-context-service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Markets" };

export default async function MarketsPage() {
  const context = await resolveAuthenticatedProjectContext();
  if (context.project) redirect(`/dashboard/projects/${context.project.slug}/markets`);
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Markets"
        title="Target countries"
        description="Analyze markets in the context of one authenticated project."
      />
      <EmptyState
        icon={Globe}
        title={
          context.state === "project_inaccessible" ? "Project unavailable" : "Create a project"
        }
        description={
          context.state === "project_inaccessible"
            ? "The selected project is unavailable in this workspace."
            : "Add your SaaS product before choosing target countries."
        }
        action={
          <Link
            href={
              context.state === "project_inaccessible"
                ? "/dashboard/projects"
                : "/dashboard/projects/new"
            }
            className={buttonVariants()}
          >
            {context.state === "project_inaccessible" ? "Choose project" : "Create project"}
          </Link>
        }
      />
    </div>
  );
}
