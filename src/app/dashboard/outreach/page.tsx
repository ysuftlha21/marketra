import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Mail } from "lucide-react";
import { getAuthContext } from "@/lib/auth/session";
import {
  listOutreachDashboardFilterOptions,
  listWorkspaceOutreachDrafts,
} from "@/features/outreach/repository/outreach-repository";

export const metadata = { title: "Outreach" };
const PAGE_SIZE = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

export default async function OutreachPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return null;
  const params = await searchParams;
  const page = Math.max(1, Number(one(params.page)) || 1);
  const filters = {
    projectId: one(params.project),
    countryId: one(params.country),
    channel: one(params.channel),
    status: one(params.status),
    language: one(params.language),
    companySearch: one(params.q)?.trim(),
    page,
    pageSize: PAGE_SIZE,
  };
  const [{ rows, count }, options] = await Promise.all([
    listWorkspaceOutreachDrafts(ctx.activeWorkspace.workspace.id, filters),
    listOutreachDashboardFilterOptions(ctx.activeWorkspace.workspace.id),
  ]);
  const typedRows = rows as unknown as Array<Record<string, unknown>>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Outreach"
        title="Localized outreach"
        description="Browse, review, and continue every saved outreach draft in this workspace."
      />
      <form
        className="grid gap-3 rounded-lg border border-border/60 bg-card p-4 sm:grid-cols-2 lg:grid-cols-6"
        aria-label="Outreach filters"
      >
        <label className="text-xs font-medium">
          Company search
          <input
            name="q"
            defaultValue={filters.companySearch}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <Filter
          label="Project"
          name="project"
          value={filters.projectId}
          options={options.projects.map((item) => ({ value: item.id, label: item.name }))}
        />
        <Filter
          label="Market"
          name="country"
          value={filters.countryId}
          options={options.countries.map((item) => ({ value: item.id, label: item.country_code }))}
        />
        <Filter
          label="Channel"
          name="channel"
          value={filters.channel}
          options={[
            { value: "email", label: "Email" },
            { value: "linkedin_connection", label: "LinkedIn connection" },
            { value: "linkedin_message", label: "LinkedIn message" },
            { value: "follow_up", label: "Follow-up" },
          ]}
        />
        <Filter
          label="Status"
          name="status"
          value={filters.status}
          options={[
            { value: "draft", label: "Draft" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <div className="flex items-end gap-2">
          <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Filter
          </button>
          <Link
            href="/dashboard/outreach"
            className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm"
          >
            Clear
          </Link>
        </div>
      </form>
      {typedRows.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No outreach drafts found"
          description="Generate outreach from a discovered company, or adjust these filters."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
          <div className="divide-y divide-border/60">
            {typedRows.map((row) => {
              const project = row.projects as { name: string; slug: string };
              const company = row.companies as { name: string };
              const role = row.company_decision_roles as { role_title: string };
              const run = row.outreach_generation_runs as {
                project_target_countries: { country_code: string };
              };
              const href = `/dashboard/projects/${project.slug}/markets/${run.project_target_countries.country_code}/discovery/${String(row.company_id)}`;
              return (
                <Link
                  key={String(row.id)}
                  href={href}
                  className="grid gap-2 p-4 transition-colors hover:bg-muted/40 md:grid-cols-[1.4fr_1fr_.7fr_.7fr_auto] md:items-center"
                >
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-xs text-muted-foreground">{role.role_title}</p>
                  </div>
                  <div className="text-sm">
                    <p>{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {run.project_target_countries.country_code}
                    </p>
                  </div>
                  <div className="text-sm capitalize">
                    {String(row.channel).replaceAll("_", " ")}
                    <p className="text-xs text-muted-foreground">
                      {String(row.language).toUpperCase()}
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-border px-2 py-1 text-xs capitalize">
                    {String(row.status)}
                  </span>
                  <div className="text-xs text-muted-foreground md:text-right">
                    <p>v{String(row.current_version_number)}</p>
                    <time>{new Date(String(row.updated_at)).toLocaleDateString()}</time>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-border/60 p-3 text-sm">
            <span>{count} drafts</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  className="rounded border px-3 py-1"
                  href={{ query: { ...params, page: page - 1 } }}
                >
                  Previous
                </Link>
              )}
              {page * PAGE_SIZE < count && (
                <Link
                  className="rounded border px-3 py-1"
                  href={{ query: { ...params, page: page + 1 } }}
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Filter({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="text-xs font-medium">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
