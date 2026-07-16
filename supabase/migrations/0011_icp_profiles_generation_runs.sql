-- 0011: ICP generation runs and profiles
-- Phase 5: country-specific ICP generation, versioning, approval lifecycle

begin;

-- ── icp_generation_runs (created first — referenced by icp_profiles) ─
create table if not exists public.icp_generation_runs (
  id                    uuid primary key default gen_random_uuid(),
  workspace_id          uuid not null references public.workspaces(id) on delete cascade,
  project_id            uuid not null references public.projects(id) on delete cascade,
  project_target_country_id uuid not null references public.project_target_countries(id) on delete cascade,
  market_analysis_run_id uuid not null references public.market_analysis_runs(id) on delete cascade,
  requested_by          uuid not null references auth.users(id) on delete cascade,
  provider              text not null,
  model                 text,
  generation_version    text not null default 'v1',
  prompt_version        text,
  status                text not null default 'pending'
                        check (status in ('pending','running','succeeded','failed')),
  input_snapshot        jsonb not null default '{}'::jsonb,
  output                jsonb,
  error_code            text,
  safe_error_message    text,
  input_tokens          integer,
  output_tokens         integer,
  estimated_cost        numeric(10,6),
  started_at            timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_icp_run_workspace on public.icp_generation_runs(workspace_id);
create index if not exists idx_icp_run_project on public.icp_generation_runs(project_id, created_at desc);
create index if not exists idx_icp_run_country on public.icp_generation_runs(project_target_country_id, created_at desc);
create index if not exists idx_icp_run_status on public.icp_generation_runs(project_target_country_id, status);

-- Partial unique index: prevent duplicate active runs per target country
create unique index if not exists uq_active_icp_run
  on public.icp_generation_runs(project_target_country_id)
  where status in ('pending', 'running');

-- RLS
alter table public.icp_generation_runs enable row level security;

create policy "Members can select ICP runs in their workspace"
  on public.icp_generation_runs for select
  using (public.can_read_workspace(workspace_id));

create policy "Members can insert ICP runs in their workspace"
  on public.icp_generation_runs for insert
  with check (public.can_read_workspace(workspace_id));

create policy "Owners and admins can update ICP runs"
  on public.icp_generation_runs for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = public.icp_generation_runs.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

create trigger icp_run_touch_updated_at
  before update on public.icp_generation_runs
  for each row execute function public.touch_updated_at();

-- ── icp_profiles ─────────────────────────────────────────────────
create table if not exists public.icp_profiles (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  project_target_country_id uuid not null references public.project_target_countries(id) on delete cascade,
  market_analysis_run_id uuid not null references public.market_analysis_runs(id) on delete cascade,
  product_analysis_run_id uuid references public.product_analysis_runs(id) on delete set null,
  created_by          uuid not null references auth.users(id) on delete cascade,
  current_generation_run_id uuid references public.icp_generation_runs(id) on delete set null,
  version             integer not null default 1,
  status              text not null default 'draft'
                      check (status in ('draft','approved','rejected','archived')),
  name                text not null,
  summary             text not null,
  country_code        text not null,
  industry_segments   jsonb not null default '{}'::jsonb,
  company_attributes  jsonb not null default '{}'::jsonb,
  buyer_roles         jsonb not null default '[]'::jsonb,
  user_roles          jsonb not null default '[]'::jsonb,
  pains               jsonb not null default '[]'::jsonb,
  desired_outcomes    jsonb not null default '[]'::jsonb,
  purchase_triggers   jsonb not null default '[]'::jsonb,
  qualification_signals    jsonb not null default '[]'::jsonb,
  disqualification_signals jsonb not null default '[]'::jsonb,
  objections          jsonb not null default '[]'::jsonb,
  preferred_channels  jsonb,
  technology_context  jsonb,
  procurement_context jsonb,
  localization_requirements jsonb,
  assumptions         jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  validation_questions jsonb not null default '[]'::jsonb,
  confidence           text check (confidence in ('low','medium','high')),
  confidence_reason   text not null default '',
  user_edits          jsonb,
  approved_by          uuid references auth.users(id) on delete set null,
  approved_at          timestamptz,
  rejected_by          uuid references auth.users(id) on delete set null,
  rejected_at          timestamptz,
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_icp_workspace on public.icp_profiles(workspace_id);
create index if not exists idx_icp_project on public.icp_profiles(project_id);
create index if not exists idx_icp_country on public.icp_profiles(project_target_country_id, version desc);
create index if not exists idx_icp_status on public.icp_profiles(workspace_id, status);
create index if not exists idx_icp_country_code on public.icp_profiles(project_target_country_id, country_code);

alter table public.icp_profiles enable row level security;

create policy "Members can select ICPs in their workspace"
  on public.icp_profiles for select
  using (public.can_read_workspace(workspace_id));

create policy "Members can insert ICPs in their workspace"
  on public.icp_profiles for insert
  with check (public.can_read_workspace(workspace_id));

create policy "Owners and admins can update ICPs"
  on public.icp_profiles for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = public.icp_profiles.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

create trigger icp_touch_updated_at
  before update on public.icp_profiles
  for each row execute function public.touch_updated_at();

commit;
