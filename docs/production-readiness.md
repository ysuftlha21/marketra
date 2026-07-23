# Phase 9 Production Readiness

Phase 10 launch procedures and the current production/deferred capability matrix are maintained in
`docs/launch-readiness.md`.

## Migration rollout

Do not run against production until reviewed:

```pwsh
supabase db push --dry-run
supabase db push
```

Migrations 0033 and 0034 add tables/indexes and do not rewrite existing rows. Rollback means
dropping only these new tables after deciding whether production usage/subscription data must be
retained.

`0033` exposes subscription state through the RLS-invoker
`workspace_subscription_states` view; external customer/subscription identifiers remain on the
service-role-only base table. `0034` enforces project/workspace consistency with a composite
foreign key. Project deletion retains the usage event and nulls only `project_id`.

## Provider activation

Mock is the local/test default. OpenAI requires its provider selection and API key. SMTP requires
host, port, user, password, and timeout. Production rate limiting requires an external endpoint and
token. Billing remains unavailable until an operator selects an account and verifies its adapter.

Never put server secrets in `NEXT_PUBLIC_*` and never print environment values.

## Operations

- Filter Vercel runtime logs for structured `marketra.operation` records and operation IDs.
- Inspect Supabase Auth logs separately for authentication email delivery.
- Use Supabase database logs for RLS/database failures.
- Run a production signup confirmation-email smoke test after SMTP/Auth configuration.

A durable queue is required before long-running generation becomes asynchronous. Manual company
entry remains usable while a paid discovery vendor decision is pending.
