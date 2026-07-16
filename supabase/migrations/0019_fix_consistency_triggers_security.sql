-- 0019: Fix workspace consistency triggers to use security definer
-- Required so the triggers can verify FK relationships when called by
-- authenticated users via RLS-permitted INSERT/UPDATE.

create or replace function public.check_discovery_run_workspace_consistency()
returns trigger
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.projects p where p.id = new.project_id and p.workspace_id = new.workspace_id) then
    raise exception 'Project % does not belong to workspace %', new.project_id, new.workspace_id;
  end if;
  if not exists (select 1 from public.project_target_countries ptc where ptc.id = new.target_country_id and ptc.workspace_id = new.workspace_id) then
    raise exception 'Target country % does not belong to workspace %', new.target_country_id, new.workspace_id;
  end if;
  if new.icp_profile_id is not null and not exists (select 1 from public.icp_profiles ip where ip.id = new.icp_profile_id and ip.workspace_id = new.workspace_id) then
    raise exception 'ICP profile % does not belong to workspace %', new.icp_profile_id, new.workspace_id;
  end if;
  return new;
end;
$$;

create or replace function public.check_project_company_workspace_consistency()
returns trigger
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from public.projects p where p.id = new.project_id and p.workspace_id = new.workspace_id) then
    raise exception 'Project % does not belong to workspace %', new.project_id, new.workspace_id;
  end if;
  if not exists (select 1 from public.project_target_countries ptc where ptc.id = new.target_country_id and ptc.workspace_id = new.workspace_id) then
    raise exception 'Target country % does not belong to workspace %', new.target_country_id, new.workspace_id;
  end if;
  if not exists (select 1 from public.companies c where c.id = new.company_id and c.workspace_id = new.workspace_id) then
    raise exception 'Company % does not belong to workspace %', new.company_id, new.workspace_id;
  end if;
  if new.icp_profile_id is not null and not exists (select 1 from public.icp_profiles ip where ip.id = new.icp_profile_id and ip.workspace_id = new.workspace_id) then
    raise exception 'ICP profile % does not belong to workspace %', new.icp_profile_id, new.workspace_id;
  end if;
  return new;
end;
$$;
