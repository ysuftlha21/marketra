import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { getTargetCountryService } from "@/features/markets/services/market-service";
import { listIcpProfiles, listIcpGenRuns } from "@/features/icp/repository/icp-repository";
import { getCountry } from "@/config/countries";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ projectSlug: string; countryCode: string }>;
}

export default async function IcpHistoryPage({ params }: PageProps) {
  const { projectSlug, countryCode } = await params;
  const ctx = await getAuthContext();
  const result = await getTargetCountryService(projectSlug, countryCode);
  if (!result) notFound();
  const { tc } = result;
  const wsId = ctx?.activeWorkspace?.workspace.id;
  const profiles = wsId ? await listIcpProfiles(wsId, tc.id) : [];
  const runs = wsId ? await listIcpGenRuns(wsId, tc.id) : [];
  const cat = getCountry(countryCode);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/dashboard/projects/${projectSlug}/markets/${countryCode}/icp`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to ICP
      </Link>
      <PageHeader
        title={`${cat?.name ?? tc.country_name} · ICP History`}
        description="Previous ICP versions and generation runs."
      />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Profile Versions</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ICP versions yet.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {profiles.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={p.status} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        v{p.version} · {new Date(p.created_at).toLocaleDateString()}
                        {p.approved_at
                          ? ` · Approved ${new Date(p.approved_at).toLocaleDateString()}`
                          : ""}
                        {p.rejected_at
                          ? ` · Rejected ${new Date(p.rejected_at).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Generation Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No generation runs yet.</p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <div>
                      <p className="text-sm text-foreground">
                        {r.provider} · {r.generation_version}
                        {r.prompt_version ? ` · ${r.prompt_version}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                        {r.completed_at
                          ? ` · Completed ${new Date(r.completed_at).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {r.input_tokens != null && (
                    <span className="text-xs text-muted-foreground">{r.input_tokens} tok</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
