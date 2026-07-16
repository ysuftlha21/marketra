import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata = { title: "Companies" };

export default function CompaniesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Companies"
        title="Discover matching companies"
        description="Enter companies manually, import a CSV, or connect a lead provider. Every match is explainable."
      />
      <EmptyState
        icon={Building2}
        title="No companies discovered yet"
        description="Once you have an ICP, Marketra will score and explain each match with positive and negative reasons."
      />
    </div>
  );
}
