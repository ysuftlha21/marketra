begin;

create table public.workspace_subscriptions (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  plan_id text not null check (plan_id in ('free', 'starter', 'growth', 'agency')),
  subscription_status text not null check (
    subscription_status in ('free', 'trialing', 'active', 'past_due', 'canceled', 'incomplete')
  ),
  billing_provider text not null default 'none',
  external_customer_id text,
  external_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index workspace_subscriptions_external_subscription_idx
  on public.workspace_subscriptions(billing_provider, external_subscription_id)
  where external_subscription_id is not null;
create index workspace_subscriptions_status_idx
  on public.workspace_subscriptions(subscription_status);

alter table public.workspace_subscriptions enable row level security;

create policy "Workspace members can read subscription state"
  on public.workspace_subscriptions for select to authenticated
  using (public.can_read_workspace(workspace_id));

-- Subscription mutations are provider/webhook-owned. Owner-facing server actions
-- must validate a BillingProvider response before using the service role.
create policy "Service role manages subscriptions"
  on public.workspace_subscriptions for all to service_role
  using (true) with check (true);

revoke all on public.workspace_subscriptions from anon;
grant select on public.workspace_subscriptions to authenticated;
grant select, insert, update, delete on public.workspace_subscriptions to service_role;

create trigger workspace_subscriptions_touch_updated_at
  before update on public.workspace_subscriptions
  for each row execute function public.touch_updated_at();

commit;
