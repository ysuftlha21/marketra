begin;

create unique index if not exists companies_workspace_id_id_unique_idx on public.companies(workspace_id, id);

create table public.buyer_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  provider_id text not null check (provider_id in ('mock', 'hunter', 'manual')),
  provider_external_id text,
  first_name text,
  last_name text,
  full_name text,
  job_title text,
  department text,
  seniority text,
  professional_profile_url text,
  email_address text,
  email_status text not null default 'unknown' check (email_status in ('unknown','found','verified','risky','invalid','not_found')),
  email_confidence integer check (email_confidence is null or email_confidence between 0 and 100),
  fetched_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buyer_contacts_workspace_project_fkey foreign key (workspace_id, project_id)
    references public.projects(workspace_id, id) on delete cascade,
  constraint buyer_contacts_workspace_company_fkey foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete cascade
);

create unique index buyer_contacts_provider_identity_idx on public.buyer_contacts
  (workspace_id, project_id, company_id, provider_id, provider_external_id)
  where provider_external_id is not null;
create index buyer_contacts_company_idx on public.buyer_contacts(workspace_id, project_id, company_id);

create table public.provider_usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  operation_type text not null check (operation_type in ('company_search','buyer_search','email_find','email_verify')),
  provider_id text not null,
  operation_id text not null,
  idempotency_key text not null,
  amount integer not null default 1 check (amount > 0),
  success boolean not null,
  controlled_error_code text,
  created_at timestamptz not null default now(),
  constraint provider_usage_workspace_project_fkey foreign key (workspace_id, project_id)
    references public.projects(workspace_id, id) on delete cascade,
  unique (workspace_id, idempotency_key)
);
create index provider_usage_period_idx on public.provider_usage_events(workspace_id, operation_type, created_at desc);

create table public.outreach_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  buyer_contact_id uuid not null references public.buyer_contacts(id) on delete cascade,
  status text not null default 'draft' check (status = 'draft'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint outreach_leads_workspace_project_fkey foreign key (workspace_id, project_id)
    references public.projects(workspace_id, id) on delete cascade,
  constraint outreach_leads_workspace_company_fkey foreign key (workspace_id, company_id)
    references public.companies(workspace_id, id) on delete cascade,
  unique (workspace_id, project_id, company_id, buyer_contact_id)
);

alter table public.buyer_contacts enable row level security;
alter table public.provider_usage_events enable row level security;
alter table public.outreach_leads enable row level security;

create policy "Members read buyer contacts" on public.buyer_contacts for select to authenticated using (public.can_read_workspace(workspace_id));
create policy "Members manage buyer contacts" on public.buyer_contacts for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "Owners and admins read provider usage" on public.provider_usage_events for select to authenticated using (public.is_owner_or_admin(workspace_id));
create policy "Service role records provider usage" on public.provider_usage_events for insert to service_role with check (true);
create policy "Members read outreach leads" on public.outreach_leads for select to authenticated using (public.can_read_workspace(workspace_id));
create policy "Members manage outreach leads" on public.outreach_leads for all to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

revoke all on public.buyer_contacts, public.provider_usage_events, public.outreach_leads from anon;
grant select, insert, update on public.buyer_contacts to authenticated;
grant select on public.provider_usage_events to authenticated;
grant select, insert on public.outreach_leads to authenticated;
grant select, insert, update, delete on public.buyer_contacts, public.provider_usage_events, public.outreach_leads to service_role;

create trigger buyer_contacts_touch_updated_at before update on public.buyer_contacts for each row execute function public.touch_updated_at();

commit;
