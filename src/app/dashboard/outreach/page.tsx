import { Mail } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata = { title: "Outreach" };

export default function OutreachPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Outreach"
        title="Localized outreach"
        description="Generate outreach in English, the target market's local language, or both — from role recommendations, not scraped personal data."
      />
      <EmptyState
        icon={Mail}
        title="No outreach yet"
        description="Discover companies first, then generate localized outreach aligned with each market."
      />
    </div>
  );
}
