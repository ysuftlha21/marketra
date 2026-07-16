-- 0007: product_analyses table, soft-delete columns, project status guard
-- Adds a versioned product_analyses table, deleted_at on audits-able tables,
-- and a database-level status transition guard on projects.

begin;

-- ── Helper: check if current user is a member of the workspace ───
create or replace function public.can_read_workspace(ws_id uuid)
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
  );
end;
$$;

-- ── product_analyses: versioned, first-class analysis output ───────
create table if not exists public.product_analyses (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  project_id    uuid not null references public.projects(id) on delete cascade,
  analysis_run_id uuid not null references public.product_analysis_runs(id) on delete cascade,
  input_snapshot   jsonb not null default '{}'::jsonb,
  output           jsonb not null default '{}'::jsonb,
  prompt_version   text not null default 'v1',
  model        text not null default '',
  provider     text not null default '',
  confidence   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists idx_product_analyses_workspace
  on public.product_analyses(workspace_id);
create index if not exists idx_product_analyses_project
  on public.product_analyses(project_id, created_at desc);

-- RLS
alter table public.product_analyses enable row level security;

create policy "Members can select product_analyses in their workspace"
  on public.product_analyses for select
  using (public.can_read_workspace(workspace_id));

create policy "Members can insert product_analyses in their workspace"
  on public.product_analyses for insert
  with check (public.can_read_workspace(workspace_id));

create policy "Owners and admins can update product_analyses"
  on public.product_analyses for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = public.product_analyses.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin')
    )
  );

-- updated_at trigger
create trigger product_analyses_touch_updated_at
  before update on public.product_analyses
  for each row execute function public.touch_updated_at();

-- ── Add deleted_at to product_analysis_runs ───────────────────────
alter table public.product_analysis_runs
  add column if not exists deleted_at timestamptz;

-- ── Add deleted_at to projects (alongside archived_at) ────────────
alter table public.projects
  add column if not exists deleted_at timestamptz;

-- ── Project status transition guard ──────────────────────────────
create or replace function public.verify_project_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  case old.status
    when 'draft' then
      if new.status not in ('active', 'archived') then
        raise exception 'Cannot transition from draft to %. Allowed: active, archived.', new.status;
      end if;
    when 'active' then
      if new.status <> 'archived' then
        raise exception 'Cannot transition from active to %. Allowed: archived.', new.status;
      end if;
    when 'archived' then
      if new.status <> 'active' then
        raise exception 'Cannot transition from archived to %. Allowed: active.', new.status;
      end if;
    else
      raise exception 'Unknown project status: %.', old.status;
  end case;

  return new;
end;
$$;

create trigger projects_guard_status_transition
  before update of status on public.projects
  for each row execute function public.verify_project_status_transition();

commit;
