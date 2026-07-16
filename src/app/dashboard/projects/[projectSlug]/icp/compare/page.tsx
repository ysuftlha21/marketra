import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { getProjectService } from "@/features/projects/services/project-service";
import { getIcpProfilesForComparison } from "@/features/icp/repository/icp-repository";
import { getCountry } from "@/config/countries";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface PageProps {
  params: Promise<{ projectSlug: string }>;
}

export default async function IcpComparePage({ params }: PageProps) {
  const { projectSlug } = await params;
  const ctx = await getAuthContext();
  const project = await getProjectService(projectSlug);
  if (!project) notFound();
  const wsId = ctx?.activeWorkspace?.workspace.id;
  const profiles = wsId ? await getIcpProfilesForComparison(wsId, project.id) : [];
  const approved = profiles.filter((p) => p.status === "approved" || p.status === "draft");
  const uniqueCountries = approved.filter(
    (p, i, arr) => arr.findIndex((x) => x.country_code === p.country_code) === i,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/dashboard/projects/${projectSlug}/markets`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to markets
      </Link>
      <PageHeader
        title="ICP Comparison"
        description={`Compare country-specific ICPs for ${project.name}.`}
      />

      {uniqueCountries.length < 2 ? (
        <EmptyState
          icon={Target}
          title="Not enough ICPs"
          description={`Generate ICPs for at least 2 countries to compare them. Currently ${uniqueCountries.length}.`}
        />
      ) : (
        <div className="space-y-4">
          {uniqueCountries.map((icp) => {
            const cat = getCountry(icp.country_code);
            const attrs = (icp.company_attributes as Record<string, string>) || {};
            return (
              <Card key={icp.id} className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{icp.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {cat?.name ?? icp.country_code} · v{icp.version} ·{" "}
                        <StatusBadge status={icp.status} />
                      </p>
                    </div>
                    {icp.confidence && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          icp.confidence === "high"
                            ? "bg-success/10 text-success"
                            : icp.confidence === "medium"
                              ? "bg-accent/10 text-accent"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {icp.confidence} confidence
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Employee Range" value={attrs.employeeRange ?? "—"} />
                    <Field label="Maturity" value={attrs.maturity ?? "—"} />
                    <Field label="Operating Model" value={attrs.operatingModel ?? "—"} />
                    <Field label="Geographic Presence" value={attrs.geographicPresence ?? "—"} />
                    <Field label="Digital Maturity" value={attrs.digitalMaturity ?? "—"} />
                    <Field label="Buying Readiness" value={attrs.buyingReadiness ?? "—"} />
                  </div>
                  {icp.qualification_signals?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        Qualification
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {icp.qualification_signals.map((s, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-success/30 bg-success/5 px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {s.replace(/^\[mock\]\s*/, "")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {icp.disqualification_signals?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                        Disqualification
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {icp.disqualification_signals.map((s, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-danger/30 bg-danger/5 px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {s.replace(/^\[mock\]\s*/, "")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium">{value.replace(/^\[mock\]\s*/, "")}</p>
    </div>
  );
}
