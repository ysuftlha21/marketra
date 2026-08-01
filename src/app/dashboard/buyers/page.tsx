import Link from "next/link";
import { Users } from "lucide-react";
import { resolveAuthenticatedProjectContext } from "@/features/projects/services/project-context-service";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Buyer Discovery" };
export default async function BuyersPage() {
  const context = await resolveAuthenticatedProjectContext();
  const discoveryHref =
    context.project && context.activeMarket
      ? `/dashboard/projects/${context.project.slug}/markets/${context.activeMarket.country_code}/discovery`
      : "/dashboard/companies";
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Buyers"
        title="Buyer Discovery"
        description="Choose a saved company before finding decision-maker roles."
      />
      <EmptyState
        icon={Users}
        title={context.counts.companies ? "Select a saved company" : "Save a company first"}
        description={
          context.counts.companies
            ? "Open a discovered company to review its buyer roles."
            : "Run company discovery and save a relevant company before finding buyers."
        }
        action={
          <Link href={discoveryHref} className={buttonVariants()}>
            {context.counts.companies ? "Choose company" : "Run company discovery"}
          </Link>
        }
      />
    </div>
  );
}
