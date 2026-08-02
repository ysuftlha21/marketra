import Link from "next/link";
import { KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCrmStage, getCrmStagesOrdered, crmStageIdSchema } from "@/config/crm-stages";
import { resolveAuthenticatedProjectContext } from "@/features/projects/services/project-context-service";
import { buttonVariants } from "@/components/ui/button";
import { getCrmEntries, type CrmEntry } from "@/features/crm/services/crm-read-service";
import { changeCompanyLifecycleAction } from "@/features/companies/api/company-actions";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "CRM" };

interface PageProps {
  searchParams: Promise<{ project?: string; market?: string; stage?: string }>;
}

export default async function CrmPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const context = await resolveAuthenticatedProjectContext(filters.project);
  const selectedMarket = context.markets.find((market) => market.id === filters.market);
  const parsedStage = crmStageIdSchema.safeParse(filters.stage);
  const stage = parsedStage.success ? parsedStage.data : undefined;
  const entries =
    context.workspaceId && context.project
      ? await getCrmEntries({
          workspaceId: context.workspaceId,
          projectId: context.project.id,
          targetCountryId: selectedMarket?.id,
          stage,
        })
      : [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="CRM"
        title="Lightweight CRM"
        description={
          context.project
            ? `Real company, buyer and outreach activity for ${context.project.name}.`
            : "Track companies and activities across your pipeline."
        }
      />

      <CrmFilters context={context} selectedMarketId={selectedMarket?.id} selectedStage={stage} />

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Visible companies" value={entries.length} />
        <Metric
          label="Buyer roles"
          value={entries.reduce((sum, entry) => sum + entry.buyerCount, 0)}
        />
        <Metric
          label="Outreach drafts"
          value={entries.reduce((sum, entry) => sum + entry.draftCount, 0)}
        />
        <Metric
          label="Qualified"
          value={
            entries.filter((entry) => entry.stage !== "discovered" && entry.stage !== "lost").length
          }
        />
      </div>

      {entries.length > 0 && context.project ? (
        <div className="space-y-3" aria-label="CRM pipeline entries">
          {entries.map((entry) => (
            <CrmEntryCard
              key={entry.projectCompanyId}
              entry={entry}
              projectSlug={context.project!.slug}
              marketCode={
                context.markets.find((market) => market.id === entry.targetCountryId)
                  ?.country_code ?? entry.countryCode
              }
            />
          ))}
        </div>
      ) : (
        <CrmEmptyState context={context} filtered={Boolean(selectedMarket || stage)} />
      )}

      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold">CRM stages</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only stages backed by stored Marketra activity are assigned. Sending and engagement are
            never inferred from an outreach draft.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {getCrmStagesOrdered().map((crmStage, index) => (
              <div key={crmStage.id} className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  tone={crmStage.color === "neutral" ? "neutral" : crmStage.color}
                >
                  {index + 1}. {crmStage.name}
                </Badge>
                {index < getCrmStagesOrdered().length - 1 ? (
                  <span className="text-muted-foreground">›</span>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CrmFilters({
  context,
  selectedMarketId,
  selectedStage,
}: {
  context: Awaited<ReturnType<typeof resolveAuthenticatedProjectContext>>;
  selectedMarketId?: string;
  selectedStage?: string;
}) {
  return (
    <form className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-3">
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Project</span>
        <select
          name="project"
          defaultValue={context.project?.slug}
          className="w-full rounded-md border bg-background p-2"
        >
          {context.projects.map((project) => (
            <option key={project.id} value={project.slug}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Market</span>
        <select
          name="market"
          defaultValue={selectedMarketId ?? ""}
          className="w-full rounded-md border bg-background p-2"
        >
          <option value="">All target markets</option>
          {context.markets.map((market) => (
            <option key={market.id} value={market.id}>
              {market.country_name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Lifecycle</span>
        <span className="flex gap-2">
          <select
            name="stage"
            defaultValue={selectedStage ?? ""}
            className="min-w-0 flex-1 rounded-md border bg-background p-2"
          >
            <option value="">All stages</option>
            {getCrmStagesOrdered().map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          <button className={buttonVariants({ variant: "outline" })} type="submit">
            Filter
          </button>
        </span>
      </label>
    </form>
  );
}

function CrmEntryCard({
  entry,
  projectSlug,
  marketCode,
}: {
  entry: CrmEntry;
  projectSlug: string;
  marketCode: string;
}) {
  const stage = getCrmStage(entry.stage);
  const companyHref = `/dashboard/projects/${projectSlug}/markets/${marketCode}/discovery/${entry.companyId}`;
  const nextHref =
    entry.nextAction === "review_company" || entry.nextAction === "find_buyers"
      ? companyHref
      : "/dashboard/outreach";
  const nextLabel = {
    review_company: "Review company",
    find_buyers: "Find buyers",
    prepare_outreach: "Prepare outreach",
    review_outreach: "Review outreach",
  }[entry.nextAction];
  return (
    <Card>
      <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] md:items-center">
        <div className="min-w-0">
          <Link href={companyHref} className="font-semibold hover:text-primary">
            {entry.companyName}
          </Link>
          <p className="truncate text-sm text-muted-foreground">
            {entry.industry} · {entry.countryCode} · {entry.sourceProvider}
          </p>
        </div>
        <Field label="Stage">
          <Badge variant="outline" tone={stage?.color ?? "neutral"}>
            {stage?.name ?? entry.stage}
          </Badge>
        </Field>
        <Field label="Buyers">{entry.buyerCount}</Field>
        <Field label="Drafts">{entry.draftCount}</Field>
        <Field label="Owner">{entry.ownerLabel}</Field>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Link href={nextHref} className={cn(buttonVariants({ size: "sm" }))}>
            {nextLabel}
          </Link>
          {entry.underlyingStatus === "discovered" ? (
            <LifecycleForm
              projectSlug={projectSlug}
              projectCompanyId={entry.projectCompanyId}
              status="shortlisted"
              label="Shortlist"
            />
          ) : entry.underlyingStatus === "shortlisted" ? (
            <LifecycleForm
              projectSlug={projectSlug}
              projectCompanyId={entry.projectCompanyId}
              status="approved"
              label="Approve"
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function LifecycleForm({
  projectSlug,
  projectCompanyId,
  status,
  label,
}: {
  projectSlug: string;
  projectCompanyId: string;
  status: string;
  label: string;
}) {
  return (
    <form
      action={async (formData) => {
        "use server";
        await changeCompanyLifecycleAction(formData);
      }}
    >
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <input type="hidden" name="pcId" value={projectCompanyId} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
        {label}
      </button>
    </form>
  );
}

function CrmEmptyState({
  context,
  filtered,
}: {
  context: Awaited<ReturnType<typeof resolveAuthenticatedProjectContext>>;
  filtered: boolean;
}) {
  const hasProject = Boolean(context.project);
  const href = filtered
    ? "/dashboard/crm"
    : hasProject
      ? "/dashboard/companies"
      : "/dashboard/projects/new";
  return (
    <EmptyState
      icon={KanbanSquare}
      title={
        filtered
          ? "No CRM entries match these filters"
          : hasProject
            ? "No saved companies yet"
            : "Create a project first"
      }
      description={
        filtered
          ? "Clear the market or lifecycle filter to see the full pipeline."
          : hasProject
            ? "Discover and save a company to begin the CRM pipeline."
            : "CRM activity is always scoped to an authenticated project."
      }
      action={
        <Link href={href} className={buttonVariants()}>
          {filtered ? "Clear filters" : hasProject ? "Discover companies" : "Create project"}
        </Link>
      }
    />
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
