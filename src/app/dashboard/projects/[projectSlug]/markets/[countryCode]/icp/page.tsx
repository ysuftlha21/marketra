import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, Target } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import { getTargetCountryService } from "@/features/markets/services/market-service";
import { getLatestIcpProfile, listIcpProfiles } from "@/features/icp/repository/icp-repository";
import { getCountry } from "@/config/countries";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatIcpDisplayValue, formatIcpLabel } from "@/features/icp/domain/icp-presentation";
import { IcpEditForm } from "@/features/icp/components/icp-edit-form";
import { getProjectIcpReadiness } from "@/features/icp/services/icp-readiness-service";
import { AdaptCountryIcpForm } from "@/features/icp/components/adapt-country-icp-form";
import { GenerateCountryIcpForm } from "@/features/icp/components/generate-country-icp-form";

interface PageProps {
  params: Promise<{ projectSlug: string; countryCode: string }>;
}

export default async function IcpPage({ params }: PageProps) {
  const { projectSlug, countryCode } = await params;
  const ctx = await getAuthContext();
  const result = await getTargetCountryService(projectSlug, countryCode);
  if (!result) notFound();
  const { tc, project } = result;
  const wsId = ctx?.activeWorkspace?.workspace.id;
  const latestIcp = wsId ? await getLatestIcpProfile(wsId, tc.id) : null;
  const history = wsId ? await listIcpProfiles(wsId, tc.id) : [];
  const readiness = await getProjectIcpReadiness(projectSlug, countryCode);
  const cat = getCountry(countryCode);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/dashboard/projects/${projectSlug}/markets/${countryCode}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to market
      </Link>

      <PageHeader
        title={`${cat?.name ?? tc.country_name} · ICP`}
        description={`Country-specific Ideal Customer Profile for ${project.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {!latestIcp && readiness.state === "needs_country_adaptation" && (
              <AdaptCountryIcpForm
                projectSlug={projectSlug}
                countryId={tc.id}
                countryCode={tc.country_code}
                countryName={cat?.name ?? tc.country_name}
              />
            )}
            {!latestIcp && readiness.state === "missing" && (
              <GenerateCountryIcpForm
                projectSlug={projectSlug}
                countryId={tc.id}
                countryCode={tc.country_code}
              />
            )}
            {!latestIcp && readiness.state === "source_incomplete" && (
              <Link
                href={`/dashboard/projects/${projectSlug}/markets/${readiness.sourceProfile.country_code}/icp`}
                className={buttonVariants()}
              >
                Complete source ICP
              </Link>
            )}
            {latestIcp?.status === "draft" && (
              <form
                action={async (fd: FormData) => {
                  "use server";
                  fd.set("projectSlug", projectSlug);
                  fd.set("icpId", latestIcp.id);
                  const m = await import("@/features/icp/api/icp-actions");
                  await m.approveIcpAction(fd);
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  <CheckCircle className="h-4 w-4" /> Approve
                </Button>
              </form>
            )}
            {latestIcp?.status === "draft" && (
              <form
                action={async (fd: FormData) => {
                  "use server";
                  fd.set("projectSlug", projectSlug);
                  fd.set("icpId", latestIcp.id);
                  const m = await import("@/features/icp/api/icp-actions");
                  await m.rejectIcpAction(fd);
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              </form>
            )}
            {latestIcp?.status === "rejected" && (
              <form
                action={async (fd: FormData) => {
                  "use server";
                  fd.set("projectSlug", projectSlug);
                  fd.set("icpId", latestIcp.id);
                  const m = await import("@/features/icp/api/icp-actions");
                  await m.restoreIcpAction(fd);
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4" /> Restore
                </Button>
              </form>
            )}
          </div>
        }
      />

      {latestIcp && <StatusBadge status={latestIcp.status} />}

      {!latestIcp ? (
        <EmptyState
          icon={Target}
          title={
            readiness.state === "needs_country_adaptation"
              ? "Reuse your approved ICP"
              : readiness.state === "source_incomplete"
                ? "Complete the source ICP"
                : readiness.state === "inaccessible"
                  ? "ICP unavailable"
                  : "No ICP yet"
          }
          description={
            readiness.state === "needs_country_adaptation"
              ? `Adapt the approved ${readiness.sourceProfile.country_code} ICP for ${cat?.name ?? tc.country_name} without calling AI or Hunter.`
              : readiness.state === "source_incomplete"
                ? `Finish the required source sections: ${readiness.incompleteSections.join(", ")}.`
                : readiness.state === "inaccessible"
                  ? "We could not verify ICP access for this project."
                  : "No approved project ICP is available to adapt. Generate a new country ICP with the explicitly labeled AI action above."
          }
        />
      ) : (
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{latestIcp.name}</CardTitle>
              <CardDescription>{latestIcp.summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>
                  Version: <span className="font-medium text-foreground">{latestIcp.version}</span>
                </span>
                {latestIcp.confidence && (
                  <span>
                    Confidence:{" "}
                    <span
                      className={cn(
                        "font-medium capitalize",
                        latestIcp.confidence === "high"
                          ? "text-success"
                          : latestIcp.confidence === "medium"
                            ? "text-accent"
                            : "text-muted-foreground",
                      )}
                    >
                      {latestIcp.confidence}
                    </span>
                  </span>
                )}
                {latestIcp.confidence_reason && (
                  <span>
                    Reason:{" "}
                    <span className="text-foreground">
                      {latestIcp.confidence_reason.replace(/^\[mock\]\s*/, "")}
                    </span>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Industries & Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <JsonSection data={latestIcp.industry_segments} />
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Company Attributes</CardTitle>
              </CardHeader>
              <CardContent>
                <JsonSection data={latestIcp.company_attributes} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Buyer Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <JsonList data={latestIcp.buyer_roles} labelKey="title" />
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">User Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <JsonList data={latestIcp.user_roles} labelKey="title" />
              </CardContent>
            </Card>
          </div>

          {latestIcp.pains && (latestIcp.pains as unknown[]).length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pains</CardTitle>
              </CardHeader>
              <CardContent>
                <StringList items={latestIcp.pains as unknown[]} />
              </CardContent>
            </Card>
          )}
          {latestIcp.purchase_triggers && latestIcp.purchase_triggers.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Purchase Triggers</CardTitle>
              </CardHeader>
              <CardContent>
                <StringList items={latestIcp.purchase_triggers as unknown[]} />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {latestIcp.qualification_signals && latestIcp.qualification_signals.length > 0 && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Qualification</CardTitle>
                </CardHeader>
                <CardContent>
                  <StringList items={latestIcp.qualification_signals as unknown[]} />
                </CardContent>
              </Card>
            )}
            {latestIcp.disqualification_signals &&
              latestIcp.disqualification_signals.length > 0 && (
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Disqualification</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StringList items={latestIcp.disqualification_signals as unknown[]} />
                  </CardContent>
                </Card>
              )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {latestIcp.assumptions && latestIcp.assumptions.length > 0 && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Assumptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <StringList items={latestIcp.assumptions as unknown[]} />
                </CardContent>
              </Card>
            )}
            {latestIcp.missing_information && latestIcp.missing_information.length > 0 && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Missing Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <StringList items={latestIcp.missing_information as unknown[]} />
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <IcpEditForm
                projectSlug={projectSlug}
                icpId={latestIcp.id}
                defaultName={latestIcp.name}
                defaultSummary={latestIcp.summary}
              />
            </CardContent>
          </Card>

          {history.length > 1 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={h.status} />
                        <span className="text-xs text-muted-foreground">
                          v{h.version} · {new Date(h.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function JsonSection({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-1.5">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex items-start gap-2 text-sm">
          <span className="text-xs text-muted-foreground capitalize min-w-[80px]">
            {formatIcpLabel(k)}:
          </span>
          <span className="text-foreground">{formatIcpDisplayValue(v)}</span>
        </div>
      ))}
    </div>
  );
}

function JsonList({ data, labelKey }: { data: Record<string, unknown>[]; labelKey: string }) {
  if (!data?.length) return <p className="text-sm text-muted-foreground">None</p>;
  return (
    <ul className="space-y-1.5">
      {data.map((item, i) => (
        <li key={i} className="text-sm text-muted-foreground">
          {typeof item === "object"
            ? String(item[labelKey] ?? JSON.stringify(item)).replace(/^\[mock\]\s*/, "")
            : String(item).replace(/^\[mock\]\s*/, "")}
        </li>
      ))}
    </ul>
  );
}

function StringList({ items }: { items: unknown[] }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">None</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
          {String(item).replace(/^\[mock\]\s*/, "")}
        </li>
      ))}
    </ul>
  );
}
