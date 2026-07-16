import { FolderKanban, Globe, Building2, Mail, Activity, Archive, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { MetricCard } from "@/components/common/metric-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth/session";
import { listWorkspaceProjects } from "@/features/projects/repository/project-repository";
import { getWorkspaceUsage } from "@/features/workspaces/services/workspace-usage-service";
import { getPlan } from "@/config/plans";
import { redirect } from "next/navigation";

export const metadata = { title: "Overview" };

export default async function DashboardOverviewPage() {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.activeWorkspace) redirect("/sign-in");

  const workspaceId = ctx.activeWorkspace.workspace.id;
  const allProjects = await listWorkspaceProjects(workspaceId, true);
  const activeProjects = allProjects.filter((p) => p.status !== "archived");
  const archivedProjects = allProjects.filter((p) => p.status === "archived");

  const usage = await getWorkspaceUsage(workspaceId);
  const plan = getPlan("free")!; // Default to free plan

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Welcome to Marketra"
        description="A visual foundation for your workspace. Add a SaaS product to begin your market entry."
        actions={
          <Link
            href="/dashboard/projects/new"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Add a SaaS project
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Active projects"
          value={activeProjects.length.toString()}
          hint={`${plan.maxActiveProjects - usage.activeProjects} slots remaining`}
          tone="neutral"
        />
        <MetricCard
          label="Archived projects"
          value={archivedProjects.length.toString()}
          hint="Hidden from active view"
          tone="neutral"
        />
        <MetricCard
          label="Project creations used"
          value={usage.creationsUsed.toString()}
          hint={`of ${plan.projectCreationsPerPeriod} this period`}
          tone={usage.creationsUsed >= plan.projectCreationsPerPeriod ? "danger" : "neutral"}
        />
        <MetricCard
          label="Active project limit"
          value={plan.maxActiveProjects.toString()}
          hint="Maximum at one time"
          tone="neutral"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Workspace activity will appear here.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Activity}
              title="No recent activity"
              description="Once you add a project and analyze a market, activity will show up here."
            />
          </CardContent>
        </Card>

        {archivedProjects.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Archived projects</CardTitle>
              <CardDescription>Projects removed from your active workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border rounded-lg border border-border">
                {archivedProjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Link
                          href={`/dashboard/projects/${p.slug}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <form
                      action={async () => {
                        "use server";
                        const mod = await import("@/features/projects/api/project-actions");
                        await mod.restoreProjectAction(p.slug);
                      }}
                    >
                      <button
                        type="submit"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Restore
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Next steps</CardTitle>
              <CardDescription>Follow the market-entry flow.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {[
                  { icon: FolderKanban, text: "Add your SaaS product and website." },
                  { icon: Globe, text: "Choose the countries you want to sell into." },
                  { icon: Building2, text: "Discover and score matching companies." },
                  { icon: Mail, text: "Generate localized outreach and track it." },
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <s.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-foreground">{s.text}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
