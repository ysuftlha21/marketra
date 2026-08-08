import {
  Archive,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  FolderKanban,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Target,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProjectPortfolioCard } from "@/features/projects/components/project-portfolio-card";
import {
  deriveProjectPortfolioView,
  formatProjectHostname,
} from "@/features/projects/domain/project-portfolio-view";
import {
  archiveProjectAction,
  restoreProjectAction,
  switchProjectAction,
} from "@/features/projects/api/project-actions";
import { resolveAuthenticatedProjectContext } from "@/features/projects/services/project-context-service";
import { listProjectPortfolio } from "@/features/projects/services/project-portfolio-service";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Projects" };

type Portfolio = Awaited<ReturnType<typeof listProjectPortfolio>>;

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

const statusFilters = ["current", "all", "active", "draft", "archived"] as const;
type StatusFilter = (typeof statusFilters)[number];

async function getProjects(): Promise<{ projects: Portfolio; failed: boolean }> {
  try {
    return { projects: await listProjectPortfolio(true), failed: false };
  } catch {
    return { projects: [], failed: true };
  }
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const normalizedStatus = statusFilters.includes(params.status as StatusFilter)
    ? (params.status as StatusFilter)
    : "current";
  const [{ projects, failed }, context] = await Promise.all([
    getProjects(),
    resolveAuthenticatedProjectContext(),
  ]);
  const filteredProjects = projects.filter((project) => {
    const statusMatches =
      normalizedStatus === "all"
        ? true
        : normalizedStatus === "current"
          ? project.status !== "archived"
          : project.status === normalizedStatus;
    if (!statusMatches) return false;
    if (!query) return true;
    const searchable = [
      project.name,
      project.slug,
      project.status,
      project.website_url ?? "",
      formatProjectHostname(project.website_url) ?? "",
      ...project.activity.targetMarkets.flatMap((market) => [market.code, market.name]),
    ]
      .join(" ")
      .toLocaleLowerCase("en");
    return searchable.includes(query.toLocaleLowerCase("en"));
  });
  const currentProjects = projects.filter((project) => project.status !== "archived");
  const activeCount = projects.filter((project) => project.status === "active").length;
  const targetMarketCount = new Set(
    currentProjects.flatMap((project) =>
      project.activity.targetMarkets.map((market) => market.code),
    ),
  ).size;
  const readyCount = currentProjects.filter(
    (project) => deriveProjectPortfolioView(project).health === "ready",
  ).length;
  const hasFilters = Boolean(query) || normalizedStatus !== "current";

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="primary">Workspace portfolio</Badge>
            <span className="text-xs text-muted-foreground">
              {currentProjects.length} current{" "}
              {currentProjects.length === 1 ? "project" : "projects"}
            </span>
            {context.workspaceName && (
              <span className="text-xs text-muted-foreground" aria-label="Current workspace">
                · {context.workspaceName}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Projects
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Move each product from market research to qualified pipeline, communication, and CRM.
          </p>
        </div>
        <Link href="/dashboard/projects/new" className={cn(buttonVariants(), "w-full sm:w-auto")}>
          <Plus aria-hidden="true" />
          New project
        </Link>
      </header>

      {!failed && projects.length > 0 && (
        <section aria-labelledby="portfolio-summary-heading">
          <h2 id="portfolio-summary-heading" className="sr-only">
            Portfolio summary
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="Current projects"
              value={currentProjects.length}
              icon={FolderKanban}
            />
            <SummaryCard label="Active workspaces" value={activeCount} icon={CircleDot} />
            <SummaryCard label="Target markets" value={targetMarketCount} icon={Target} />
            <SummaryCard label="Campaign ready" value={readyCount} icon={CheckCircle2} />
          </div>
        </section>
      )}

      {!failed && projects.length > 0 && (
        <section
          className="rounded-xl border border-border bg-surface p-3 shadow-sm"
          aria-label="Project controls"
        >
          <form className="flex flex-col gap-3 lg:flex-row lg:items-center" method="get">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search projects</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Search by project, website, or market"
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </label>
            <label className="relative">
              <span className="sr-only">Filter projects by status</span>
              <Archive
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <select
                name="status"
                defaultValue={normalizedStatus}
                className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-9 text-sm text-foreground outline-none transition-colors duration-150 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-44"
              >
                <option value="current">Current projects</option>
                <option value="all">All projects</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
            </label>
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "secondary" }), "w-full lg:w-auto")}
            >
              Apply
            </button>
            {hasFilters && (
              <Link
                href="/dashboard/projects"
                className={cn(buttonVariants({ variant: "ghost" }), "w-full lg:w-auto")}
              >
                Clear
              </Link>
            )}
          </form>
        </section>
      )}

      {failed ? (
        <ErrorState
          title="Projects are temporarily unavailable"
          description="Your project data is safe. Refresh the page to try loading the workspace again."
        />
      ) : projects.length === 0 ? (
        <FirstProjectEmptyState />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching projects"
          description="Adjust the search or status filter to return to your project workspaces."
          action={
            <Link href="/dashboard/projects" className={cn(buttonVariants({ variant: "outline" }))}>
              Clear filters
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="project-workspaces-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2
                id="project-workspaces-heading"
                className="text-base font-semibold text-foreground"
              >
                Project workspaces
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {filteredProjects.length}{" "}
                {filteredProjects.length === 1 ? "workspace" : "workspaces"} shown
              </p>
            </div>
          </div>
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            {filteredProjects.map((project) => (
              <ProjectPortfolioCard
                key={project.id}
                project={project}
                view={deriveProjectPortfolioView(project)}
                hostname={formatProjectHostname(project.website_url)}
                createdLabel={formatDate(project.created_at)}
                updatedLabel={formatDate(project.updated_at)}
                isActive={context.project?.id === project.id}
                actions={
                  <ProjectActions project={project} isActive={context.project?.id === project.id} />
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof FolderKanban;
}) {
  return (
    <Card className="flex min-w-0 items-center gap-3 p-4 shadow-none sm:p-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

function ProjectActions({ project, isActive }: { project: Portfolio[number]; isActive: boolean }) {
  const projectBase = `/dashboard/projects/${project.slug}`;
  return (
    <details className="group/menu relative">
      <summary
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
        )}
        aria-label={`Actions for ${project.name}`}
      >
        <MoreHorizontal aria-hidden="true" />
      </summary>
      <div className="absolute right-0 top-11 z-30 w-52 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg">
        <ProjectActionLink href={projectBase}>Open project</ProjectActionLink>
        <ProjectActionLink href={`${projectBase}/edit`}>Edit or rename</ProjectActionLink>
        <ProjectActionLink href={`${projectBase}/markets`}>Manage markets</ProjectActionLink>
        <ProjectActionLink href="/dashboard/analytics">View analytics</ProjectActionLink>
        <ProjectActionLink href={`/dashboard/crm?project=${encodeURIComponent(project.slug)}`}>
          Open CRM
        </ProjectActionLink>
        <div className="my-1 border-t border-border" />
        {!isActive && project.status === "active" && (
          <form
            action={async (formData) => {
              "use server";
              await switchProjectAction(formData);
            }}
          >
            <input type="hidden" name="projectSlug" value={project.slug} />
            <button
              type="submit"
              className="w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Set as current
            </button>
          </form>
        )}
        {project.status === "archived" ? (
          <form
            action={async () => {
              "use server";
              await restoreProjectAction(project.slug);
            }}
          >
            <button
              type="submit"
              className="w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Restore project
            </button>
          </form>
        ) : (
          <form
            action={async () => {
              "use server";
              await archiveProjectAction(project.slug);
            }}
          >
            <button
              type="submit"
              className="w-full rounded-md px-2.5 py-2 text-left text-sm text-danger transition-colors duration-150 hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Archive project
            </button>
          </form>
        )}
      </div>
    </details>
  );
}

function ProjectActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-2.5 py-2 text-sm transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  );
}

function FirstProjectEmptyState() {
  const workflow = [
    "Choose markets",
    "Complete intelligence",
    "Build pipeline",
    "Prepare outreach",
  ];
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)] lg:p-10">
        <div className="flex flex-col justify-center">
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <FolderKanban className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Create your first market-entry workspace
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            A project keeps research, ICPs, companies, decision makers, communication, and CRM
            activity connected to one product.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/projects/new"
              className={cn(buttonVariants(), "w-full sm:w-auto")}
            >
              <Plus aria-hidden="true" /> Create project
            </Link>
            <Link
              href="/dashboard/markets"
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              Explore markets
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Your project workflow
          </div>
          <ol className="mt-5 space-y-4">
            {workflow.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-surface text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
            Progress and next actions stay visible as the project develops.
          </div>
        </div>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
