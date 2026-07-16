-- 0028_decision_role_feedback.sql

begin;

create table if not exists public.decision_role_feedback (
  id                              uuid primary key default gen_random_uuid(),
  workspace_id                    uuid not null references public.workspaces(id) on delete cascade,
  project_id                      uuid not null references public.projects(id) on delete cascade,
  company_id                      uuid not null references public.companies(id) on delete cascade,
  decision_role_id                uuid not null references public.company_decision_roles(id) on delete cascade,
  
  action                          text not null
                                  check (action in (
                                    'approved',
                                    'rejected',
                                    'edited',
                                    'set_primary',
                                    'unset_primary',
                                    'set_secondary',
                                    'unset_secondary',
                                    'note_updated',
                                    'manually_created',
                                    'archived'
                                  )),
  
  previous_value                  jsonb,
  next_value                      jsonb,
  reason                          text,
  
  created_by                      uuid not null references auth.users(id) on delete cascade,
  created_at                      timestamptz not null default now()
);

create index if not exists idx_drf_workspace on public.decision_role_feedback(workspace_id);
create index if not exists idx_drf_decision_role on public.decision_role_feedback(decision_role_id);
create index if not exists idx_drf_company on public.decision_role_feedback(company_id);

-- RLS
alter table public.decision_role_feedback enable row level security;

-- Policies
create policy "decision_role_feedback_select_workspace" on public.decision_role_feedback
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = decision_role_feedback.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "decision_role_feedback_insert_workspace" on public.decision_role_feedback
  for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
    and
    -- Ensure decision_role_id belongs to the identical scope
    exists (
      select 1 from public.company_decision_roles cdr
      where cdr.id = decision_role_id 
        and cdr.workspace_id = workspace_id
        and cdr.project_id = project_id
        and cdr.company_id = company_id
    )
    and created_by = auth.uid()
  );

-- Note: Intentionally no update or delete policies for users. Table is append-only.

-- Service Role Policy
create policy "decision_role_feedback_service_role" on public.decision_role_feedback
  for all
  using (auth.jwt()->>'role' = 'service_role');

-- Grants (ONLY SELECT and INSERT for authenticated users)
grant select, insert on table public.decision_role_feedback to authenticated;
grant select, insert, update, delete on table public.decision_role_feedback to service_role;

commit;
