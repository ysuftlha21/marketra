-- 0018: Immutable enforcement for terminal discovery runs
-- Prevents updates to completed/failed/cancelled runs and ensures
-- status transitions are valid (queued → running → completed|failed, any → cancelled).

create or replace function public.check_discovery_run_transition()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Allow inserts freely
  if tg_op = 'INSERT' then
    return new;
  end if;

  -- Terminal states cannot be modified
  if old.status in ('completed', 'failed', 'cancelled') then
    raise exception 'Cannot modify a run in terminal state %', old.status
      using errcode = 'IMMUT';
  end if;

  -- Status transitions must be valid
  if old.status = 'queued' and new.status not in ('running', 'cancelled') then
    raise exception 'Invalid transition from queued to %', new.status
      using errcode = 'INVTR';
  end if;

  if old.status = 'running' and new.status not in ('completed', 'failed', 'cancelled') then
    raise exception 'Invalid transition from running to %', new.status
      using errcode = 'INVTR';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_discovery_run_immutable on public.company_discovery_runs;

create trigger trg_discovery_run_immutable
  before update on public.company_discovery_runs
  for each row
  execute function public.check_discovery_run_transition();

-- Grant execute to authenticated role for the trigger function
-- (trigger runs as invoker, so the calling user must have permission)
grant all on public.company_discovery_runs to service_role;
