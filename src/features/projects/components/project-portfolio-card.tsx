import {
  ArrowRight,
  Building2,
  FileText,
  FolderKanban,
  Globe2,
  MapPinned,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { ProjectSummaryRow } from "../repository/project-repository";
import type {
  ProjectHealth,
  ProjectPortfolioActivity,
  ProjectPortfolioView,
} from "../domain/project-portfolio-view";

interface ProjectPortfolioCardProps {
  project: ProjectSummaryRow & { activity: ProjectPortfolioActivity };
  view: ProjectPortfolioView;
  hostname: string | null;
  createdLabel: string;
  updatedLabel: string;
  isActive: boolean;
  actions: ReactNode;
}

const healthTone: Record<ProjectHealth, NonNullable<BadgeProps["tone"]>> = {
  ready: "success",
  healthy: "success",
  needs_research: "warning",
  incomplete: "warning",
  draft: "neutral",
  archived: "neutral",
};

export function ProjectPortfolioCard({
  project,
  view,
  hostname,
  createdLabel,
  updatedLabel,
  isActive,
  actions,
}: ProjectPortfolioCardProps) {
  const visibleMarkets = project.activity.targetMarkets.slice(0, 4);
  const hiddenMarketCount = project.activity.targetMarkets.length - visibleMarkets.length;
  const metrics = [
    {
      label: "Markets",
      value: project.activity.targetMarkets.length,
      icon: MapPinned,
    },
    { label: "ICPs", value: project.activity.approvedIcpCount, icon: Target },
    { label: "Companies", value: project.activity.companyCount, icon: Building2 },
    { label: "Decision makers", value: project.activity.buyerCount, icon: Users },
    { label: "Drafts", value: project.activity.outreachDraftCount, icon: FileText },
  ];

  return (
    <Card className="group relative flex min-w-0 flex-col overflow-visible transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-within:border-primary/40 focus-within:shadow-md">
      <Link
        href={`/dashboard/projects/${project.slug}`}
        aria-label={`Open ${project.name} project`}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <div className="pointer-events-none relative z-10 flex items-start gap-3 border-b border-border/70 p-5 sm:p-6">
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
          <FolderKanban className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground">
                  {project.name}
                </h2>
                {isActive && <Badge tone="primary">Current</Badge>}
                <Badge tone={healthTone[view.health]}>{view.healthLabel}</Badge>
              </div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {hostname && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{hostname}</span>
                  </span>
                )}
                <span>Created {createdLabel}</span>
                <span>Updated {updatedLabel}</span>
              </div>
            </div>
            <div className="pointer-events-auto relative z-10 shrink-0">{actions}</div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col gap-5 p-5 sm:p-6">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-foreground">Workspace progress</span>
            <span className="tabular-nums text-muted-foreground">{view.progressPercent}%</span>
          </div>
          <div
            className="grid grid-cols-9 gap-1"
            role="progressbar"
            aria-label={`${project.name} workflow progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={view.progressPercent}
          >
            {view.stages.map((stage) => (
              <span
                key={stage.label}
                title={`${stage.label}: ${stage.complete ? "complete" : "not complete"}`}
                className={cn("h-1.5 rounded-full bg-muted", stage.complete && "bg-primary")}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {view.completedStageCount} of {view.stages.length} workflow milestones complete
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-md border border-border/70 bg-muted/20 px-3 py-2.5">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </dt>
              <dd className="mt-1 text-base font-semibold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="min-h-7">
          {visibleMarkets.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" aria-label="Target markets">
              {visibleMarkets.map((market) => (
                <Badge key={market.code} tone="neutral" className="font-normal">
                  {market.code}
                </Badge>
              ))}
              {hiddenMarketCount > 0 && (
                <Badge tone="neutral" className="font-normal">
                  +{hiddenMarketCount} more
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No target markets selected yet.</p>
          )}
        </div>

        <Link
          href={view.nextAction.href}
          aria-label={`Next action: ${view.nextAction.label}`}
          className="pointer-events-auto relative z-10 mt-auto flex min-w-0 items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-left transition-colors duration-150 hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium uppercase tracking-wide text-primary">
              Recommended next
            </span>
            <span className="mt-0.5 block text-sm font-semibold text-foreground">
              {view.nextAction.label}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {view.nextAction.description}
            </span>
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-primary transition-transform duration-150 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </Card>
  );
}
