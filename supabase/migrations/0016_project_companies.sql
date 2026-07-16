-- 0016: Project-company candidates with scoring
-- Phase 6: ICP-fit scored company candidates per project and target country

begin;

create table if not exists public.project_companies (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  project_id            uuid not null references public.projects(id) on delete cascade,
  target_country_id     uuid not null references public.project_target_countries(id),
  company_id            uuid not null references public.companies(id),
  discovery_run_id      uuid not null references public.company_discovery_runs(id),
  icp_profile_id        uuid references public.icp_profiles(id) on delete set null,
  status                text not null default 'discovered'
                        check (status in ('discovered','shortlisted','approved','rejected','archived')),
  fit_score             integer not null default 0
                        check (fit_score >= 0 and fit_score <= 100),
  fit_grade             text not null default 'medium'
                        check (fit_grade in ('strong','medium','weak','disqualified')),
  qualification_reasons jsonb not null default '[]'::jsonb,
  disqualification_reasons jsonb not null default '[]'::jsonb,
  matched_signals       jsonb not null default '[]'::jsonb,
  missing_signals       jsonb not null default '[]'::jsonb,
  confidence_score      integer not null default 50
                        check (confidence_score >= 0 and confidence_score <= 100),
  scoring_snapshot      jsonb not null default '{}'::jsonb,
  provider_rank         integer,
  reviewer_notes        text,
  reviewed_by           uuid references auth.users(id) on delete set null,
  reviewed_at           timestamptz,
  archived_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_pc_workspace on public.project_companies(workspace_id);
create index if not exists idx_pc_project on public.project_companies(project_id);
create index if not exists idx_pc_target_country on public.project_companies(target_country_id);
create index if not exists idx_pc_company on public.project_companies(company_id);
create index if not exists idx_pc_discovery_run on public.project_companies(discovery_run_id);
create index if not exists idx_pc_status on public.project_companies(status);
create index if not exists idx_pc_fit_score on public.project_companies(fit_score desc);

create unique index if not exists uq_project_company_candidate
  on public.project_companies(project_id, target_country_id, company_id);

alter table public.project_companies enable row level security;

create policy "Members can select project companies in their workspace"
  on public.project_companies for select
  using (public.can_read_workspace(workspace_id));

create policy "Members can insert project companies in their workspace"
  on public.project_companies for insert
  with check (public.can_read_workspace(workspace_id));

create policy "Members can update project companies in their workspace"
  on public.project_companies for update
  using (public.can_read_workspace(workspace_id))
  with check (public.can_read_workspace(workspace_id));

create policy "Only owners and admins can delete project companies"
  on public.project_companies for delete
  using (
    public.can_read_workspace(workspace_id)
    and public.is_owner_or_admin(workspace_id)
  );

create or replace function public.check_project_company_workspace_consistency()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.workspace_id = new.workspace_id
  ) then
    raise exception using
      message = 'Project must belong to the same workspace as the project company.',
      errcode = '23503';
  end if;
  if not exists (
    select 1 from public.project_target_countries ptc
    where ptc.id = new.target_country_id and ptc.workspace_id = new.workspace_id
  ) then
    raise exception using
      message = 'Target country must belong to the same workspace as the project company.',
      errcode = '23503';
  end if;
  if not exists (
    select 1 from public.companies c
    where c.id = new.company_id and c.workspace_id = new.workspace_id
  ) then
    raise exception using
      message = 'Company must belong to the same workspace as the project company.',
      errcode = '23503';
  end if;
  if not exists (
    select 1 from public.company_discovery_runs cdr
    where cdr.id = new.discovery_run_id and cdr.workspace_id = new.workspace_id
  ) then
    raise exception using
      message = 'Discovery run must belong to the same workspace as the project company.',
      errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger trg_project_company_workspace_consistency
  before insert or update on public.project_companies
  for each row execute function public.check_project_company_workspace_consistency();

commit;
