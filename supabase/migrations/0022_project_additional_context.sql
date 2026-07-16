-- 0022_project_additional_context
-- Add additional context to projects and create project_clarification_answers table.

-- 1. Add additional_context JSONB to projects
alter table public.projects add column if not exists additional_context jsonb;

-- 2. Create project_clarification_answers table
create table if not exists public.project_clarification_answers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_analysis_run_id uuid not null references public.product_analysis_runs(id) on delete cascade,
  question_key text not null,
  question_text text not null,
  answer text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Common indexes
create index if not exists project_answers_workspace_idx on public.project_clarification_answers (workspace_id);
create index if not exists project_answers_project_idx on public.project_clarification_answers (project_id);
create index if not exists project_answers_run_idx on public.project_clarification_answers (source_analysis_run_id);
-- Ensure one answer per question per run
create unique index if not exists project_answers_unique_idx on public.project_clarification_answers (source_analysis_run_id, question_key);

-- 3. RLS - project_clarification_answers
alter table public.project_clarification_answers enable row level security;

-- Workspace members may read answers for their workspace.
create policy "clarification_answers_member_select"
  on public.project_clarification_answers for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = project_clarification_answers.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Workspace members may insert answers.
create policy "clarification_answers_member_insert"
  on public.project_clarification_answers for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = project_clarification_answers.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Workspace members may update answers (to allow editing their own workspace's answers).
create policy "clarification_answers_member_update"
  on public.project_clarification_answers for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = project_clarification_answers.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- 4. updated_at triggers
drop trigger if exists project_answers_touch_updated_at on public.project_clarification_answers;
create trigger project_answers_touch_updated_at
  before update on public.project_clarification_answers
  for each row execute function public.touch_updated_at();
