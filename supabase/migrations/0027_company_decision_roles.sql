-- 0027_company_decision_roles.sql

begin;

create table if not exists public.company_decision_roles (
  id                              uuid primary key default gen_random_uuid(),
  workspace_id                    uuid not null references public.workspaces(id) on delete cascade,
  project_id                      uuid not null references public.projects(id) on delete cascade,
  company_id                      uuid not null references public.companies(id) on delete cascade,
  
  source_run_id                   uuid not null references public.decision_role_runs(id) on delete cascade,
  source_type                     text not null default 'generated'
                                  check (source_type in ('generated', 'manual')),

  role_key                        text not null,
  role_title                      text not null,
  role_family                     text not null,
  department                      text not null,
  buying_role                     text not null,
  
  priority                        text not null default 'supporting'
                                  check (priority in ('primary', 'secondary', 'supporting', 'low')),
  
  fit_score                       integer not null check (fit_score >= 0 and fit_score <= 100),
  confidence_score                integer not null check (confidence_score >= 0 and confidence_score <= 100),
  
  reasoning                       text not null,
  evidence                        jsonb not null default '{}'::jsonb,
  likely_pain_points              jsonb not null default '[]'::jsonb,
  likely_objections               jsonb not null default '[]'::jsonb,
  recommended_message_angles      jsonb not null default '[]'::jsonb,
  title_variants                  jsonb not null default '[]'::jsonb,
  seniority_levels                jsonb not null default '[]'::jsonb,
  
  company_size_relevance          text not null,
  country_relevance               text not null,

  status                          text not null default 'suggested'
                                  check (status in ('suggested', 'approved', 'rejected', 'archived')),
  
  is_primary                      boolean not null default false,
  is_secondary                    boolean not null default false,
  
  user_notes                      text,
  
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

-- Mutual exclusion constraint
alter table public.company_decision_roles 
add constraint primary_secondary_mutual_exclusion 
check (not (is_primary and is_secondary));

-- Unique active primary constraint per company
create unique index if not exists company_decision_roles_primary_idx 
on public.company_decision_roles (workspace_id, project_id, company_id) 
where is_primary = true and status != 'archived' and status != 'rejected';

-- Unique active secondary constraint per company
create unique index if not exists company_decision_roles_secondary_idx 
on public.company_decision_roles (workspace_id, project_id, company_id) 
where is_secondary = true and status != 'archived' and status != 'rejected';

create index if not exists idx_cdr_workspace on public.company_decision_roles(workspace_id);
create index if not exists idx_cdr_project on public.company_decision_roles(project_id);
create index if not exists idx_cdr_company on public.company_decision_roles(company_id);
create index if not exists idx_cdr_source_run on public.company_decision_roles(source_run_id);
create index if not exists idx_cdr_status on public.company_decision_roles(status);

-- Updated_at trigger
create trigger company_decision_roles_touch_updated_at
  before update on public.company_decision_roles
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.company_decision_roles enable row level security;

-- Policies
create policy "company_decision_roles_select_workspace" on public.company_decision_roles
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = company_decision_roles.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "company_decision_roles_insert_workspace" on public.company_decision_roles
  for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
    and
    -- Ensure source_run_id belongs to the identical workspace/project/company scope
    exists (
      select 1 from public.decision_role_runs drr
      where drr.id = source_run_id 
        and drr.workspace_id = workspace_id
        and drr.project_id = project_id
        and drr.company_id = company_id
    )
  );

create policy "company_decision_roles_update_workspace" on public.company_decision_roles
  for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Service Role Policy
create policy "company_decision_roles_service_role" on public.company_decision_roles
  for all
  using (auth.jwt()->>'role' = 'service_role');

-- Grants
grant select, insert, update, delete on table public.company_decision_roles to authenticated, service_role;

commit;
