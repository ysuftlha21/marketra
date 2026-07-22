begin;

-- The primary key already makes id globally unique; this composite unique
-- index additionally provides the exact referenced key required to enforce
-- that an event's project belongs to its workspace.
create unique index projects_workspace_id_id_unique_idx
  on public.projects(workspace_id, id);

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid,
  operation_type text not null,
  provider_id text not null,
  model_id text,
  generation_run_id uuid,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  total_tokens integer check (total_tokens is null or total_tokens >= 0),
  estimated_cost numeric(14, 8) check (estimated_cost is null or estimated_cost >= 0),
  currency text check (currency is null or char_length(currency) = 3),
  duration_ms integer not null check (duration_ms >= 0),
  success boolean not null,
  controlled_error_code text,
  created_at timestamptz not null default now(),
  constraint ai_usage_events_workspace_project_fkey
    foreign key (workspace_id, project_id)
    references public.projects(workspace_id, id)
    on delete set null (project_id)
);

create index ai_usage_events_workspace_created_idx
  on public.ai_usage_events(workspace_id, created_at desc);
create index ai_usage_events_project_created_idx
  on public.ai_usage_events(project_id, created_at desc)
  where project_id is not null;
create index ai_usage_events_operation_idx
  on public.ai_usage_events(workspace_id, operation_type, created_at desc);

alter table public.ai_usage_events enable row level security;

create policy "Owners and admins can read AI usage"
  on public.ai_usage_events for select to authenticated
  using (public.is_owner_or_admin(workspace_id));
create policy "Service role records AI usage"
  on public.ai_usage_events for insert to service_role
  with check (true);
create policy "Service role reads AI usage"
  on public.ai_usage_events for select to service_role
  using (true);

revoke all on public.ai_usage_events from anon;
grant select on public.ai_usage_events to authenticated;
grant select, insert on public.ai_usage_events to service_role;

commit;
