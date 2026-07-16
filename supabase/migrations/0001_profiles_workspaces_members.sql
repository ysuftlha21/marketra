-- 0001_profiles_workspaces_members
-- Phase 2: authentication, users and workspace multi-tenancy.
-- Every tenant-owned table carries RLS; workspace_id scopes access.

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- workspaces ----------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workspaces_slug_key on public.workspaces (lower(slug));
create index if not exists workspaces_created_by_idx on public.workspaces (created_by);

-- ---------- workspace_members ----------
do $$ begin
  create type public.workspace_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null; end $$;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx on public.workspace_members (user_id);

-- ---------- user_preferences ----------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_workspace_id uuid references public.workspaces(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ========== RLS policies ==========

alter table public.profiles enable row level security;

create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_self_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

alter table public.workspaces enable row level security;

create policy "workspaces_member_read"
  on public.workspaces for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspaces.id and wm.user_id = auth.uid()
    )
  );

create policy "workspaces_owner_insert"
  on public.workspaces for insert
  with check (auth.uid() = created_by);

create policy "workspaces_admin_update"
  on public.workspaces for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspaces.id
        and wm.user_id = auth.uid()
        and wm.role in ('owner','admin')
    )
  );

create policy "workspaces_owner_delete"
  on public.workspaces for delete
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspaces.id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

alter table public.workspace_members enable row level security;

create policy "members_workspace_read"
  on public.workspace_members for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid()
    )
  );

create policy "members_admin_insert"
  on public.workspace_members for insert
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner','admin')
    )
  );

create policy "members_admin_update"
  on public.workspace_members for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner','admin')
    )
  );

create policy "members_admin_or_self_delete"
  on public.workspace_members for delete
  using (
    workspace_members.user_id = auth.uid()
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner','admin')
    )
  );

alter table public.user_preferences enable row level security;

create policy "prefs_self_select"
  on public.user_preferences for select
  using (user_id = auth.uid());

create policy "prefs_self_update"
  on public.user_preferences for update
  using (user_id = auth.uid());

create policy "prefs_self_insert"
  on public.user_preferences for insert
  with check (user_id = auth.uid());

-- ========== updated_at triggers ==========
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists workspaces_touch_updated_at on public.workspaces;
create trigger workspaces_touch_updated_at
  before update on public.workspaces
  for each row execute function public.touch_updated_at();

drop trigger if exists workspace_members_touch_updated_at on public.workspace_members;
create trigger workspace_members_touch_updated_at
  before update on public.workspace_members
  for each row execute function public.touch_updated_at();

drop trigger if exists user_preferences_touch_updated_at on public.user_preferences;
create trigger user_preferences_touch_updated_at
  before update on public.user_preferences
  for each row execute function public.touch_updated_at();

-- ---------- auto-profile trigger from auth.users ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
