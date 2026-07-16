-- 0029_outreach_generation_runs.sql
-- Outreach generation run lifecycle, immutable snapshots, active-run uniqueness.
begin;

create table if not exists public.outreach_generation_runs (
  id                              uuid primary key default gen_random_uuid(),
  workspace_id                    uuid not null references public.workspaces(id) on delete cascade,
  project_id                      uuid not null references public.projects(id) on delete cascade,
  company_id                      uuid not null references public.companies(id) on delete cascade,
  decision_role_id                uuid not null references public.company_decision_roles(id) on delete cascade,

  source_decision_role_run_id     uuid not null references public.decision_role_runs(id) on delete cascade,
  source_product_analysis_run_id  uuid not null references public.product_analysis_runs(id) on delete cascade,
  source_market_analysis_run_id   uuid references public.market_analysis_runs(id) on delete set null,
  source_icp_profile_id           uuid not null references public.icp_profiles(id) on delete cascade,
  source_discovery_run_id         uuid references public.company_discovery_runs(id) on delete set null,

  channel                         text not null
                                  check (channel in ('email','linkedin_connection','linkedin_message','follow_up')),
  message_type                    text not null
                                  check (message_type in ('initial_contact','meeting_request','connection_request','follow_up','re_engagement')),

  status                          text not null default 'pending'
                                  check (status in ('pending','running','succeeded','failed','cancelled')),
  current_stage                   text not null default 'queued'
                                  check (current_stage in (
                                    'queued',
                                    'loading_product_context',
                                    'loading_market_context',
                                    'loading_icp',
                                    'loading_company_context',
                                    'loading_decision_role',
                                    'generating_outreach',
                                    'validating_result',
                                    'saving_draft',
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

  idempotency_key                 text not null,

  started_by                      uuid not null references auth.users(id) on delete cascade,
  started_at                      timestamptz,
  completed_at                    timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

-- Active-run uniqueness: only one pending/running run per scope+channel+message_type
create unique index if not exists outreach_generation_runs_active_idx
  on public.outreach_generation_runs (workspace_id, project_id, company_id, decision_role_id, channel, message_type)
  where status in ('pending', 'running');

create index if not exists idx_ogr_workspace on public.outreach_generation_runs(workspace_id);
create index if not exists idx_ogr_project on public.outreach_generation_runs(project_id);
create index if not exists idx_ogr_company on public.outreach_generation_runs(company_id);
create index if not exists idx_ogr_decision_role on public.outreach_generation_runs(decision_role_id);
create index if not exists idx_ogr_status on public.outreach_generation_runs(status);

-- Updated_at trigger
create trigger outreach_generation_runs_touch_updated_at
  before update on public.outreach_generation_runs
  for each row execute function public.touch_updated_at();

-- Immutability trigger: prevent mutation of succeeded run snapshots
create or replace function public.protect_outreach_run_snapshot()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'succeeded' then
    if new.input_snapshot is distinct from old.input_snapshot then
      raise exception 'Cannot mutate input_snapshot of a succeeded outreach generation run';
    end if;
    if new.result_snapshot is distinct from old.result_snapshot then
      raise exception 'Cannot mutate result_snapshot of a succeeded outreach generation run';
    end if;
  end if;
  return new;
end;
$$;

create trigger outreach_generation_runs_protect_snapshot
  before update on public.outreach_generation_runs
  for each row execute function public.protect_outreach_run_snapshot();

-- RLS
alter table public.outreach_generation_runs enable row level security;

create policy "ogr_select_workspace" on public.outreach_generation_runs
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = outreach_generation_runs.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "ogr_insert_workspace" on public.outreach_generation_runs
  for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.workspace_id = workspace_id
    )
    and exists (
      select 1 from public.companies c
      where c.id = company_id and c.workspace_id = workspace_id
    )
    and exists (
      select 1 from public.company_decision_roles cdr
      where cdr.id = decision_role_id
        and cdr.workspace_id = workspace_id
        and cdr.project_id = project_id
        and cdr.company_id = company_id
    )
    and exists (
      select 1 from public.decision_role_runs drr
      where drr.id = source_decision_role_run_id
        and drr.workspace_id = workspace_id
        and drr.project_id = project_id
        and drr.company_id = company_id
    )
    and exists (
      select 1 from public.product_analysis_runs pa
      where pa.id = source_product_analysis_run_id
        and pa.project_id = project_id
    )
    and exists (
      select 1 from public.icp_profiles icp
      where icp.id = source_icp_profile_id
        and icp.project_id = project_id
    )
    and started_by = auth.uid()
  );

create policy "ogr_update_workspace" on public.outreach_generation_runs
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

create policy "ogr_service_role" on public.outreach_generation_runs
  for all
  using (auth.jwt()->>'role' = 'service_role');

grant select, insert, update on table public.outreach_generation_runs to authenticated;
grant select, insert, update, delete on table public.outreach_generation_runs to service_role;

commit;
