-- 0026_decision_role_runs.sql

begin;

create table if not exists public.decision_role_runs (
  id                              uuid primary key default gen_random_uuid(),
  workspace_id                    uuid not null references public.workspaces(id) on delete cascade,
  project_id                      uuid not null references public.projects(id) on delete cascade,
  company_id                      uuid not null references public.companies(id) on delete cascade,
  
  source_product_analysis_run_id  uuid not null references public.product_analysis_runs(id) on delete cascade,
  source_market_analysis_run_id   uuid references public.market_analysis_runs(id) on delete set null,
  source_icp_profile_id           uuid not null references public.icp_profiles(id) on delete cascade,
  source_discovery_run_id         uuid references public.company_discovery_runs(id) on delete set null,

  status                          text not null default 'pending'
                                  check (status in ('pending','running','succeeded','failed','cancelled')),
  current_stage                   text not null default 'queued'
                                  check (current_stage in (
                                    'queued',
                                    'loading_product_context',
                                    'loading_market_context',
                                    'loading_icp',
                                    'loading_company_context',
                                    'generating_roles',
                                    'validating_result',
                                    'saving_roles',
                                    'complete'
                                  )),

  schema_version                  text not null default '1.0.0',
  prompt_version                  text not null default '1.0.0',
  provider                        text not null,
  provider_version                text not null default '0.1.0',
  model                           text,

  input_snapshot                  jsonb not null default '{}'::jsonb,
  result_snapshot                 jsonb,

  safe_error_message              text,
  error_code                      text,

  started_by                      uuid not null references auth.users(id) on delete cascade,
  started_at                      timestamptz,
  completed_at                    timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

-- Active-run uniqueness constraint
create unique index if not exists decision_role_runs_active_idx 
on public.decision_role_runs (workspace_id, project_id, company_id) 
where status in ('pending', 'running');

create index if not exists idx_drr_workspace on public.decision_role_runs(workspace_id);
create index if not exists idx_drr_project on public.decision_role_runs(project_id);
create index if not exists idx_drr_company on public.decision_role_runs(company_id);
create index if not exists idx_drr_status on public.decision_role_runs(status);

-- Updated_at trigger
create trigger decision_role_runs_touch_updated_at
  before update on public.decision_role_runs
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.decision_role_runs enable row level security;

-- Policies
create policy "decision_role_runs_select_workspace" on public.decision_role_runs
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = decision_role_runs.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "decision_role_runs_insert_workspace" on public.decision_role_runs
  for insert
  with check (
    -- user must be in workspace
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
    and
    -- project must belong to workspace
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.workspace_id = workspace_id
    )
    and
    -- company must belong to workspace
    exists (
      select 1 from public.companies c
      where c.id = company_id and c.workspace_id = workspace_id
    )
    and
    -- Product analysis must belong to project
    exists (
      select 1 from public.product_analysis_runs pa
      where pa.id = source_product_analysis_run_id and pa.project_id = project_id
    )
    and
    -- ICP must belong to project
    exists (
      select 1 from public.icp_profiles icp
      where icp.id = source_icp_profile_id and icp.project_id = project_id
    )
    and started_by = auth.uid()
  );

create policy "decision_role_runs_update_workspace" on public.decision_role_runs
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
create policy "decision_role_runs_service_role" on public.decision_role_runs
  for all
  using (auth.jwt()->>'role' = 'service_role');

-- Grants
grant select, insert, update, delete on table public.decision_role_runs to authenticated, service_role;

commit;
