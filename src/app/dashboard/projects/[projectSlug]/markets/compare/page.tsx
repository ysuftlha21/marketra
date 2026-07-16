import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, MapPin, CreditCard, Languages, Star, Globe } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { getProjectService } from "@/features/projects/services/project-service";
import { listProjectTargetCountriesService } from "@/features/markets/services/market-service";
import { getCountry } from "@/config/countries";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/status-badge";
import { cn } from "@/lib/utils/cn";

interface PageProps {
  params: Promise<{ projectSlug: string }>;
}

export default async function ComparePage({ params }: PageProps) {
  const { projectSlug } = await params;
  await getAuthContext();
  const project = await getProjectService(projectSlug);
  if (!project) notFound();
  const marketList = await listProjectTargetCountriesService(projectSlug);
  const analyzed = marketList.filter((m) => m.latest_analysis_status === "succeeded");

  const recOrder: Record<string, number> = { pursue: 0, investigate: 1, deprioritize: 2 };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/dashboard/projects/${projectSlug}/markets`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to markets
      </Link>
      <PageHeader
        title="Market comparison"
        description={`Compare analyzed target countries for ${project.name}.`}
      />

      {analyzed.length < 2 ? (
        <EmptyState
          icon={BarChart3}
          title="Not enough analyzed countries"
          description={`Analyze at least 2 countries to compare them. Currently ${analyzed.length} analyzed.`}
        />
      ) : (
        <div className="space-y-4">
          {analyzed
            .sort(
              (a, b) =>
                (recOrder[a.latest_recommendation ?? ""] ?? 99) -
                (recOrder[b.latest_recommendation ?? ""] ?? 99),
            )
            .map((m) => {
              const cat = getCountry(m.country_code);
              return (
                <Card key={m.id} className="border-border/60 transition-colors hover:border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-sm font-medium">
                          {m.country_code}
                        </span>
                        <div>
                          <CardTitle className="text-base">{cat?.name ?? m.country_name}</CardTitle>
                          <p className="text-xs text-muted-foreground capitalize">
                            {cat?.region?.split("-").join(" ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.latest_recommendation && (
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                              m.latest_recommendation === "pursue"
                                ? "bg-success/10 text-success"
                                : m.latest_recommendation === "investigate"
                                  ? "bg-accent/10 text-accent"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {m.latest_recommendation}{" "}
                            {m.latest_confidence ? `· ${m.latest_confidence}` : ""}
                          </span>
                        )}
                        <StatusBadge status={m.status} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field
                        icon={MapPin}
                        label="Region"
                        value={cat?.region?.split("-").join(" ") ?? "—"}
                      />
                      <Field icon={CreditCard} label="Currency" value={cat?.currency ?? "—"} />
                      <Field
                        icon={Languages}
                        label="Language"
                        value={cat?.primaryLanguage ?? "—"}
                      />
                      <Field
                        icon={Star}
                        label="Priority"
                        value={m.priority ? String(m.priority) : "—"}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: typeof Globe; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="truncate text-xs font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
