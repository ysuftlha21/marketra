-- 0014: Company discovery runs
-- Phase 6: immutable company search execution tracking

begin;

-- ── Helper: check if current user is owner or admin of the workspace ───
create or replace function public.is_owner_or_admin(ws_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = ws_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
end;
$$;

create table if not exists public.company_discovery_runs (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  project_id            uuid not null references public.projects(id) on delete cascade,
  target_country_id     uuid not null references public.project_target_countries(id) on delete cascade,
  icp_profile_id        uuid references public.icp_profiles(id) on delete set null,
  provider              text not null,
  provider_version      text not null default '0.1.0',
  status                text not null default 'queued'
                        check (status in ('queued','running','completed','failed','cancelled')),
  input_snapshot        jsonb not null default '{}'::jsonb,
  criteria_snapshot     jsonb not null default '{}'::jsonb,
  result_summary        jsonb not null default '{}'::jsonb,
  error_code            text,
  safe_error_message    text,
  started_at            timestamptz,
  completed_at          timestamptz,
  failed_at             timestamptz,
  created_by            uuid not null references auth.users(id) on delete cascade,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_cdr_workspace on public.company_discovery_runs(workspace_id);
create index if not exists idx_cdr_project on public.company_discovery_runs(project_id);
create index if not exists idx_cdr_target_country on public.company_discovery_runs(target_country_id);
create index if not exists idx_cdr_status on public.company_discovery_runs(status);

create unique index if not exists uq_active_discovery_run
  on public.company_discovery_runs(target_country_id)
  where status in ('queued', 'running');

alter table public.company_discovery_runs enable row level security;

create policy "Members can select discovery runs in their workspace"
  on public.company_discovery_runs for select
  using (public.can_read_workspace(workspace_id));

create policy "Members can insert discovery runs in their workspace"
  on public.company_discovery_runs for insert
  with check (public.can_read_workspace(workspace_id));

create policy "Owners and admins can update discovery runs"
  on public.company_discovery_runs for update
  using (
    public.can_read_workspace(workspace_id)
    and public.is_owner_or_admin(workspace_id)
  );

create policy "Only owners can delete discovery runs"
  on public.company_discovery_runs for delete
  using (
    public.can_read_workspace(workspace_id)
    and public.is_owner_or_admin(workspace_id)
  );

-- Workspace consistency: run must reference entities from the same workspace
create or replace function public.check_discovery_run_workspace_consistency()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.workspace_id = new.workspace_id
  ) then
    raise exception using
      message = 'Project must belong to the same workspace as the discovery run.',
      errcode = '23503';
  end if;
  if not exists (
    select 1 from public.project_target_countries ptc
    where ptc.id = new.target_country_id and ptc.workspace_id = new.workspace_id
  ) then
    raise exception using
      message = 'Target country must belong to the same workspace as the discovery run.',
      errcode = '23503';
  end if;
  if new.icp_profile_id is not null and not exists (
    select 1 from public.icp_profiles ip
    where ip.id = new.icp_profile_id and ip.workspace_id = new.workspace_id
  ) then
    raise exception using
      message = 'ICP profile must belong to the same workspace as the discovery run.',
      errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger trg_discovery_run_workspace_consistency
  before insert or update on public.company_discovery_runs
  for each row execute function public.check_discovery_run_workspace_consistency();

commit;
