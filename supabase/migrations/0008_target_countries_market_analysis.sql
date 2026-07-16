-- 0008: project target countries and market analysis runs
-- Phase 4: country selection, market intelligence, market analysis execution

begin;

-- ── project_target_countries ─────────────────────────────────────
create table if not exists public.project_target_countries (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  project_id        uuid not null references public.projects(id) on delete cascade,
  country_code      text not null,
  country_name      text not null,
  region_code       text,
  status            text not null default 'selected'
                    check (status in ('selected','analyzing','analyzed','shortlisted','rejected')),
  priority          integer,
  notes             text,
  analysis_assumptions jsonb,
  added_by          uuid not null references auth.users(id) on delete cascade,
  shortlisted_at    timestamptz,
  rejected_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One country per project
create unique index if not exists uq_project_country
  on public.project_target_countries(project_id, upper(country_code));

create index if not exists idx_ptc_workspace
  on public.project_target_countries(workspace_id);
create index if not exists idx_ptc_project
  on public.project_target_countries(project_id, status);
create index if not exists idx_ptc_country_code
  on public.project_target_countries(upper(country_code));
create index if not exists idx_ptc_status
  on public.project_target_countries(workspace_id, status);

-- RLS
alter table public.project_target_countries enable row level security;

create policy "Members can select target countries in their workspace"
  on public.project_target_countries for select
  using (public.can_read_workspace(workspace_id));

create policy "Members can insert target countries in their workspace"
  on public.project_target_countries for insert
  with check (public.can_read_workspace(workspace_id));

create policy "Owners and admins can update target countries"
  on public.project_target_countries for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = public.project_target_countries.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

create policy "Owners and admins can delete target countries"
  on public.project_target_countries for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = public.project_target_countries.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

-- updated_at trigger
create trigger ptc_touch_updated_at
  before update on public.project_target_countries
  for each row execute function public.touch_updated_at();

-- ── market_analysis_runs ─────────────────────────────────────────
create table if not exists public.market_analysis_runs (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references public.workspaces(id) on delete cascade,
  project_id              uuid not null references public.projects(id) on delete cascade,
  project_target_country_id uuid not null references public.project_target_countries(id) on delete cascade,
  requested_by            uuid not null references auth.users(id) on delete cascade,
  provider                text not null,
  model                   text,
  analysis_version        text not null default 'v1',
  prompt_version          text,
  status                  text not null default 'pending'
                          check (status in ('pending','running','succeeded','failed')),
  input_snapshot          jsonb not null default '{}'::jsonb,
  intelligence_snapshot   jsonb,
  output                  jsonb,
  error_code              text,
  safe_error_message      text,
  source_metadata         jsonb,
  input_tokens            integer,
  output_tokens           integer,
  estimated_cost          numeric(10,6),
  started_at              timestamptz,
  completed_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists idx_mar_workspace
  on public.market_analysis_runs(workspace_id);
create index if not exists idx_mar_project
  on public.market_analysis_runs(project_id, created_at desc);
create index if not exists idx_mar_country
  on public.market_analysis_runs(project_target_country_id, created_at desc);
create index if not exists idx_mar_status
  on public.market_analysis_runs(project_target_country_id, status);
create index if not exists idx_mar_workspace_project
  on public.market_analysis_runs(workspace_id, project_id);

-- Partial unique index: prevent duplicate active runs per target country
create unique index if not exists uq_active_market_run
  on public.market_analysis_runs(project_target_country_id)
  where status in ('pending', 'running');

-- RLS
alter table public.market_analysis_runs enable row level security;

create policy "Members can select market analysis runs in their workspace"
  on public.market_analysis_runs for select
  using (public.can_read_workspace(workspace_id));

create policy "Members can insert market analysis runs in their workspace"
  on public.market_analysis_runs for insert
  with check (public.can_read_workspace(workspace_id));

create policy "Owners and admins can update market analysis runs"
  on public.market_analysis_runs for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = public.market_analysis_runs.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

-- updated_at trigger
create trigger mar_touch_updated_at
  before update on public.market_analysis_runs
  for each row execute function public.touch_updated_at();

commit;
