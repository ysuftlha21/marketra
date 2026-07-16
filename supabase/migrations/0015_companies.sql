-- 0015: Normalized company identities
-- Phase 6: workspace-scoped company records with domain deduplication

begin;

create table if not exists public.companies (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  canonical_name        text not null,
  normalized_name       text not null,
  primary_domain        text,
  normalized_domain     text,
  website_url           text,
  country_code          text not null default 'US',
  headquarters_city     text,
  industry              text not null default 'Other',
  industry_tags         jsonb not null default '[]'::jsonb,
  employee_count_min    integer,
  employee_count_max    integer,
  employee_count_estimate integer,
  annual_revenue_min    numeric(14,2),
  annual_revenue_max    numeric(14,2),
  annual_revenue_currency text not null default 'USD',
  company_type          text,
  founded_year          integer,
  technology_signals    jsonb not null default '[]'::jsonb,
  growth_signals        jsonb not null default '[]'::jsonb,
  source_provider       text,
  source_external_id    text,
  source_url            text,
  source_snapshot       jsonb not null default '{}'::jsonb,
  first_seen_at         timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_companies_workspace on public.companies(workspace_id);
create index if not exists idx_companies_domain on public.companies(normalized_domain);
create index if not exists idx_companies_name on public.companies(normalized_name);
create index if not exists idx_companies_country on public.companies(country_code);
create index if not exists idx_companies_industry on public.companies(industry);

create unique index if not exists uq_company_workspace_domain
  on public.companies(workspace_id, normalized_domain)
  where normalized_domain is not null;

alter table public.companies enable row level security;

create policy "Members can select companies in their workspace"
  on public.companies for select
  using (public.can_read_workspace(workspace_id));

create policy "Members can insert companies in their workspace"
  on public.companies for insert
  with check (public.can_read_workspace(workspace_id));

create policy "Members can update companies in their workspace"
  on public.companies for update
  using (public.can_read_workspace(workspace_id))
  with check (public.can_read_workspace(workspace_id));

create policy "Owners and admins can delete companies"
  on public.companies for delete
  using (
    public.can_read_workspace(workspace_id)
    and public.is_owner_or_admin(workspace_id)
  );

commit;
