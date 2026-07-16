-- 0006_projects_product_analysis
-- Phase 3: projects and product analysis.
-- Every tenant-owned row carries workspace_id; RLS enforces isolation.

-- ============================================================
-- 1. Project status enum
-- ============================================================
do $$ begin
  create type public.project_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 2. Projects table
-- ============================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  website_url text,
  product_description text not null,
  target_customer_summary text,
  business_model text,
  pricing_summary text,
  current_markets text[] default '{}',
  preferred_language text not null default 'en',
  status public.project_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

-- Unique slug per workspace
create unique index if not exists projects_workspace_slug on public.projects (workspace_id, lower(slug));

-- Common query indexes
create index if not exists projects_workspace_idx on public.projects (workspace_id);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_updated_at_idx on public.projects (workspace_id, updated_at desc);

-- ============================================================
-- 3. Product analysis runs table
-- ============================================================
do $$ begin
  create type public.analysis_run_status as enum ('pending', 'running', 'succeeded', 'failed');
exception when duplicate_object then null; end $$;

create table if not exists public.product_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  prompt_version text not null,
  status public.analysis_run_status not null default 'pending',
  input_snapshot jsonb not null,
  output jsonb,
  error_code text,
  safe_error_message text,
  input_tokens int,
  output_tokens int,
  estimated_cost numeric(10,6),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analysis_runs_project_idx on public.product_analysis_runs (project_id, created_at desc);
create index if not exists analysis_runs_workspace_idx on public.product_analysis_runs (workspace_id);
create index if not exists analysis_runs_status_idx on public.product_analysis_runs (status);
create index if not exists analysis_runs_created_at_idx on public.product_analysis_runs (created_at desc);

-- ============================================================
-- 4. RLS — Projects
-- ============================================================
alter table public.projects enable row level security;

-- Workspace members may read projects in their workspace.
create policy "projects_member_select"
  on public.projects for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = projects.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Workspace members may create projects.
-- workspace_id is enforced via check; the user must be a member.
create policy "projects_member_insert"
  on public.projects for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = projects.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Owner and admin may update any project; the creator may update their own draft.
create policy "projects_admin_or_self_update"
  on public.projects for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = projects.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
    or (
      projects.created_by = auth.uid()
      and projects.status = 'draft'
    )
  );

-- Only draft projects may be deleted; owner/admin or creator may delete.
create policy "projects_draft_delete"
  on public.projects for delete
  using (
    projects.status = 'draft'
    and (
      exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = projects.workspace_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner', 'admin')
      )
      or projects.created_by = auth.uid()
    )
  );

-- ============================================================
-- 5. RLS — Product analysis runs
-- ============================================================
alter table public.product_analysis_runs enable row level security;

-- Workspace members may read analysis runs for their workspace.
create policy "analysis_member_select"
  on public.product_analysis_runs for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = product_analysis_runs.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Workspace members may create analysis runs.
create policy "analysis_member_insert"
  on public.product_analysis_runs for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = product_analysis_runs.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Owner/admin may update any run; the requester may set running/failed.
create policy "analysis_admin_or_self_update"
  on public.product_analysis_runs for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = product_analysis_runs.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
    or product_analysis_runs.requested_by = auth.uid()
  );

-- ============================================================
-- 6. updated_at triggers
-- ============================================================
drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists analysis_runs_touch_updated_at on public.product_analysis_runs;
create trigger analysis_runs_touch_updated_at
  before update on public.product_analysis_runs
  for each row execute function public.touch_updated_at();
