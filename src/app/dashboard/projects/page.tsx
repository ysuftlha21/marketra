import { FolderKanban, Plus, Globe } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { listProjectsService } from "@/features/projects/services/project-service";
import { StatusBadge } from "@/components/common/status-badge";
import type { ProjectStatus } from "@/features/projects/domain/project-status";

export const metadata = { title: "Projects" };

async function getProjects() {
  try {
    return await listProjectsService();
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Your SaaS projects"
        description="Each project represents a SaaS product you are bringing to market."
        actions={
          <Link
            href="/dashboard/projects/new"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            <Plus className="h-4 w-4" aria-hidden /> New project
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Add your first SaaS product to start analyzing markets and discovering companies."
          action={
            <Link
              href="/dashboard/projects/new"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <Plus className="h-4 w-4" aria-hidden /> Create your first project
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 sm:px-5">Project</th>
                <th className="hidden px-4 py-3 sm:table-cell sm:px-5">Website</th>
                <th className="hidden px-4 py-3 sm:table-cell sm:px-5">Status</th>
                <th className="hidden px-4 py-3 md:table-cell md:px-5">Updated</th>
                <th className="px-4 py-3 sm:px-5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 sm:px-5">
                    <Link
                      href={`/dashboard/projects/${p.slug}`}
                      className="flex items-center gap-3"
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FolderKanban className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.slug}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {p.website_url ? (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Globe className="h-3 w-3" aria-hidden />
                        <span className="truncate max-w-[160px] inline-block">
                          {new URL(p.website_url).hostname}
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusBadge status={p.status as ProjectStatus} />
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 sm:px-6">
                    <Link
                      href={`/dashboard/projects/${p.slug}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      <span>View</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
