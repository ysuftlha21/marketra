import { Globe } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { CountryBadge } from "@/components/common/country-badge";
import { Card, CardContent } from "@/components/ui/card";
import { countries } from "@/config/countries";

export const metadata = { title: "Markets" };

export default function MarketsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Markets"
        title="Target countries"
        description="Pick the countries you want to sell into. Marketra analyzes each one in context."
      />
      <EmptyState
        icon={Globe}
        title="No target markets selected"
        description="Add a project first, then choose the countries you want to analyze."
      />
      <Card>
        <CardContent>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Supported countries
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {countries.map((c) => (
              <CountryBadge key={c.code} countryCode={c.code} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
