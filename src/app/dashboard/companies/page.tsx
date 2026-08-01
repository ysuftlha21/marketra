import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Globe2 } from "lucide-react";
import { resolveAuthenticatedProjectContext } from "@/features/projects/services/project-context-service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Company Discovery" };

export default async function CompaniesPage() {
  const context = await resolveAuthenticatedProjectContext();
  const activeProject = context.project;
  if (!activeProject) {
    return (
      <DiscoveryGateway>
        <EmptyState
          icon={Building2}
          title="Create a project first"
          description="Company discovery uses a project and target market to keep every result workspace-scoped."
          action={
            <Link href="/dashboard/projects/new" className={buttonVariants()}>
              Create project
            </Link>
          }
        />
      </DiscoveryGateway>
    );
  }

  const activeMarket = context.activeMarket;

  if (activeMarket) {
    redirect(
      `/dashboard/projects/${activeProject.slug}/markets/${activeMarket.country_code}/discovery`,
    );
  }

  return (
    <DiscoveryGateway>
      <EmptyState
        icon={Globe2}
        title="Select a target market"
        description={`Add a country to ${activeProject.name} before starting company discovery.`}
        action={
          <Link
            href={`/dashboard/projects/${activeProject.slug}/markets`}
            className={buttonVariants()}
          >
            Select market
          </Link>
        }
      />
    </DiscoveryGateway>
  );
}

function DiscoveryGateway({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Companies"
        title="Discover matching companies"
        description="Search within the active project and market using the configured provider."
      />
      {children}
    </div>
  );
}
