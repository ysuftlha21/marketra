-- 0030_outreach_drafts.sql
-- Per-company/role/channel outreach drafts with status and version tracking.
begin;

create table if not exists public.outreach_drafts (
  id                              uuid primary key default gen_random_uuid(),
  workspace_id                    uuid not null references public.workspaces(id) on delete cascade,
  project_id                      uuid not null references public.projects(id) on delete cascade,
  company_id                      uuid not null references public.companies(id) on delete cascade,
  decision_role_id                uuid not null references public.company_decision_roles(id) on delete cascade,

  source_run_id                   uuid not null references public.outreach_generation_runs(id) on delete cascade,

  channel                         text not null
                                  check (channel in ('email','linkedin_connection','linkedin_message','follow_up')),
  message_type                    text not null
                                  check (message_type in ('initial_contact','meeting_request','connection_request','follow_up','re_engagement')),
  language                        text not null
                                  check (language in ('en','tr')),

  subject                         text,
  body                            text not null,
  call_to_action                  text,

  tone                            text not null
                                  check (tone in ('professional','concise','consultative','friendly','direct')),
  length                          text not null
                                  check (length in ('short','medium','long')),

  status                          text not null default 'draft'
                                  check (status in ('draft','approved','rejected','archived')),
  source_type                     text not null default 'generated'
                                  check (source_type in ('generated','manual')),

  current_version_number          integer not null default 1,
  is_current                      boolean not null default true,

  user_notes                      text,

  created_by                      uuid not null references auth.users(id) on delete cascade,
  updated_by                      uuid,

  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  archived_at                     timestamptz
);

create index if not exists idx_od_workspace on public.outreach_drafts(workspace_id);
create index if not exists idx_od_project on public.outreach_drafts(project_id);
create index if not exists idx_od_company on public.outreach_drafts(company_id);
create index if not exists idx_od_decision_role on public.outreach_drafts(decision_role_id);
create index if not exists idx_od_source_run on public.outreach_drafts(source_run_id);
create index if not exists idx_od_status on public.outreach_drafts(status);

-- Updated_at trigger
create trigger outreach_drafts_touch_updated_at
  before update on public.outreach_drafts
  for each row execute function public.touch_updated_at();

-- RLS
alter table public.outreach_drafts enable row level security;

create policy "od_select_workspace" on public.outreach_drafts
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = outreach_drafts.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "od_insert_workspace" on public.outreach_drafts
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
      select 1 from public.outreach_generation_runs ogr
      where ogr.id = source_run_id
        and ogr.workspace_id = workspace_id
        and ogr.project_id = project_id
        and ogr.company_id = company_id
    )
    and created_by = auth.uid()
  );

create policy "od_update_workspace" on public.outreach_drafts
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

-- Note: intentionally no delete policy for normal users

create policy "od_service_role" on public.outreach_drafts
  for all
  using (auth.jwt()->>'role' = 'service_role');

grant select, insert, update on table public.outreach_drafts to authenticated;
grant select, insert, update, delete on table public.outreach_drafts to service_role;

commit;
