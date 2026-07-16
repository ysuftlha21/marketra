-- 0004_fix_rls_permissions
-- Fixes:
-- 1. Grant table permissions to authenticated and anon roles (RLS requires base GRANTs)
-- 2. Security definer helpers to avoid infinite recursion in workspace_members policies
--    (PostgreSQL applies RLS to subqueries referencing the same table as the policy)

-- Step 1: Grant schema + table permissions
grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant select on all tables in schema public to anon;

-- Step 2: Security definer helpers — bypass RLS to avoid self-referencing recursion

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- Step 3: Recreate workspace_member policies using security definer helpers

drop policy if exists "members_workspace_read" on public.workspace_members;
create policy "members_workspace_read"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "members_admin_insert" on public.workspace_members;
create policy "members_admin_insert"
  on public.workspace_members for insert
  with check (public.is_workspace_admin(workspace_id));

drop policy if exists "members_admin_update" on public.workspace_members;
create policy "members_admin_update"
  on public.workspace_members for update
  using (public.is_workspace_admin(workspace_id));

drop policy if exists "members_admin_or_self_delete" on public.workspace_members;
create policy "members_admin_or_self_delete"
  on public.workspace_members for delete
  using (
    workspace_members.user_id = auth.uid()
    or public.is_workspace_admin(workspace_id)
  );
