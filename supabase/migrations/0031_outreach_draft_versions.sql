-- 0031_outreach_draft_versions.sql
-- Append-only version history per outreach draft.
begin;

create table if not exists public.outreach_draft_versions (
  id                              uuid primary key default gen_random_uuid(),
  workspace_id                    uuid not null references public.workspaces(id) on delete cascade,
  project_id                      uuid not null references public.projects(id) on delete cascade,
  company_id                      uuid not null references public.companies(id) on delete cascade,

  outreach_draft_id               uuid not null references public.outreach_drafts(id) on delete cascade,
  version_number                  integer not null,

  subject                         text,
  body                            text not null,
  call_to_action                  text,

  tone                            text not null
                                  check (tone in ('professional','concise','consultative','friendly','direct')),
  length                          text not null
                                  check (length in ('short','medium','long')),

  change_type                     text not null
                                  check (change_type in ('generated','edited','regenerated','approved_snapshot','manual')),
  change_reason                   text,

  source_run_id                   uuid references public.outreach_generation_runs(id) on delete set null,

  created_by                      uuid not null references auth.users(id) on delete cascade,
  created_at                      timestamptz not null default now()
);

-- Version uniqueness per draft
create unique index if not exists outreach_draft_versions_unique_idx
  on public.outreach_draft_versions (outreach_draft_id, version_number);

create index if not exists idx_odv_workspace on public.outreach_draft_versions(workspace_id);
create index if not exists idx_odv_project on public.outreach_draft_versions(project_id);
create index if not exists idx_odv_company on public.outreach_draft_versions(company_id);
create index if not exists idx_odv_draft on public.outreach_draft_versions(outreach_draft_id);

-- RLS: append-only — no update, no delete for normal users
alter table public.outreach_draft_versions enable row level security;

create policy "odv_select_workspace" on public.outreach_draft_versions
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = outreach_draft_versions.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "odv_insert_workspace" on public.outreach_draft_versions
  for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id
        and wm.user_id = auth.uid()
    )
    and exists (
      select 1 from public.outreach_drafts od
      where od.id = outreach_draft_id
        and od.workspace_id = workspace_id
        and od.project_id = project_id
        and od.company_id = company_id
    )
    and created_by = auth.uid()
  );

-- Intentionally: NO update or delete policies for normal users (append-only)

create policy "odv_service_role" on public.outreach_draft_versions
  for all
  using (auth.jwt()->>'role' = 'service_role');

grant select, insert on table public.outreach_draft_versions to authenticated;
grant select, insert, update, delete on table public.outreach_draft_versions to service_role;

commit;
