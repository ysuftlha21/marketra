-- 0013: Prevent hard deletion of target countries with analysis or ICP history
-- Phase 5/Repair Sprint: database-level enforcement for Finding 6
-- Protects historical market analysis runs, ICP profiles, and ICP generation runs
-- from being silently removed via ON DELETE CASCADE.

begin;

-- Trigger function: blocks deletion when child records exist
create or replace function public.prevent_target_country_deletion_with_history()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.market_analysis_runs
    where project_target_country_id = old.id
  ) then
    raise exception using
      message = format(
        'Cannot delete target country "%s" (%s): it has %s associated market analysis run(s). Archive or reject instead.',
        old.country_name, old.country_code,
        (select count(*)::text from public.market_analysis_runs where project_target_country_id = old.id)
      ),
      hint = 'Use reject or archive status transitions instead of deletion.',
      errcode = '23503';
  end if;

  if exists (
    select 1 from public.icp_generation_runs
    where project_target_country_id = old.id
  ) then
    raise exception using
      message = format(
        'Cannot delete target country "%s" (%s): it has %s associated ICP generation run(s). Archive or reject instead.',
        old.country_name, old.country_code,
        (select count(*)::text from public.icp_generation_runs where project_target_country_id = old.id)
      ),
      hint = 'Use reject or archive status transitions instead of deletion.',
      errcode = '23503';
  end if;

  if exists (
    select 1 from public.icp_profiles
    where project_target_country_id = old.id
  ) then
    raise exception using
      message = format(
        'Cannot delete target country "%s" (%s): it has %s associated ICP profile(s). Archive or reject instead.',
        old.country_name, old.country_code,
        (select count(*)::text from public.icp_profiles where project_target_country_id = old.id)
      ),
      hint = 'Use reject or archive status transitions instead of deletion.',
      errcode = '23503';
  end if;

  return old;
end;
$$;

-- Attach trigger: fires before every row deletion
drop trigger if exists trg_prevent_target_country_deletion_with_history
  on public.project_target_countries;

create trigger trg_prevent_target_country_deletion_with_history
  before delete on public.project_target_countries
  for each row execute function public.prevent_target_country_deletion_with_history();

commit;
