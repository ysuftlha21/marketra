-- 0002_create_workspace_rpc
-- Atomic workspace creation + owner membership + active-workspace preference.
-- SECURITY DEFINER so the caller can insert into workspaces + workspace_members in one transaction
-- while RLS still governs ordinary per-table access. The function validates the caller identity
-- and grants the owner role; it cannot be used to escalate an existing membership.

create or replace function public.create_workspace(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_name is null or length(btrim(p_name)) < 2 then
    raise exception 'Workspace name must be at least 2 characters' using errcode = '23514';
  end if;
  if p_slug is null or not (lower(p_slug) ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$') then
    raise exception 'Invalid slug' using errcode = '23514';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (p_name, lower(p_slug), v_user)
  on conflict (lower(slug)) do nothing
  returning id into v_workspace_id;

  if v_workspace_id is null then
    -- slug already exists
    raise exception 'Workspace slug is already taken' using errcode = '23505';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user, 'owner')
  on conflict (workspace_id, user_id) do update set role = 'owner';

  insert into public.user_preferences (user_id, active_workspace_id)
  values (v_user, v_workspace_id)
  on conflict (user_id)
  do update set active_workspace_id = excluded.active_workspace_id, updated_at = now();

  return v_workspace_id;
end $$;

revoke all on function public.create_workspace(text, text) from public;
grant execute on function public.create_workspace(text, text) to authenticated;