import Link from "next/link";
import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { resolveAuthenticatedProjectContext } from "@/features/projects/services/project-context-service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "ICP Builder" };
export default async function IcpGatewayPage() {
  const context = await resolveAuthenticatedProjectContext();
  if (context.project && context.activeMarket)
    redirect(
      `/dashboard/projects/${context.project.slug}/markets/${context.activeMarket.country_code}/icp`,
    );
  const href = context.project
    ? `/dashboard/projects/${context.project.slug}/markets`
    : "/dashboard/projects/new";
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="ICP"
        title="ICP Builder"
        description="Build a country-specific customer profile from the active project."
      />
      <EmptyState
        icon={Target}
        title={context.project ? "Select a target market" : "Create a project"}
        description={
          context.project
            ? "An ICP belongs to a project market. Select one to continue."
            : "Add your product before building an ICP."
        }
        action={
          <Link href={href} className={buttonVariants()}>
            {context.project ? "Select market" : "Create project"}
          </Link>
        }
      />
    </div>
  );
}
