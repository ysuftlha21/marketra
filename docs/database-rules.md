# Database Rules

## Outreach draft history

`outreach_draft_versions` is append-only for authenticated users. Version numbers are unique and
monotonic per draft. Editing and restoring run through an atomic security-invoker function that
locks the current draft and checks the expected version, preventing stale writes or split draft/
history state. Review transitions use the same lock and enforce Owner/Admin authority in PostgreSQL.
Draft, project, company, role, and generation-run relationships remain workspace-consistent under
RLS; archived drafts are excluded from active dashboard and company-detail queries.

> PostgreSQL on Supabase. RLS is mandatory. Repositories are the only code that touches tables.
> Read with `docs/architecture.md` and `docs/security-rules.md`.

## 1. Tenancy

- Every tenant-owned table carries `workspace_id uuid NOT NULL` and a foreign key to `workspaces`.
- Composite indexes typically lead with `workspace_id` for tenant-scoped queries.
- **Never** rely on frontend filtering alone. RLS is the source of truth.

## 2. Row Level Security (RLS)

- `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;` on every tenant-owned table.
- Policies reference `auth.uid()` and an `workspace_members` (or equivalent) check:
  - `SELECT` — members of the workspace can read.
  - `INSERT` — `workspace_id` must equal one of the user's workspaces.
  - `UPDATE / DELETE` — owner/admin by default; members per-feature.
- The **service role key** bypasses RLS and is used **server-side only**, but repositories must
  still explicitly filter by `workspace_id` (defense in depth).
- The **anon/browser key** must respect RLS. Never ship the service role key to the browser.

## 3. Required columns (convention)

Tenant-owned tables include at minimum:

| Column         | Type          | Notes                                 |
| -------------- | ------------- | ------------------------------------- |
| `id`           | `uuid`        | `gen_random_uuid()` primary key       |
| `workspace_id` | `uuid`        | FK → `workspaces(id)`                 |
| `created_at`   | `timestamptz` | `default now()`                       |
| `created_by`   | `uuid`        | FK → `auth.users(id)` (nullable late) |
| `updated_at`   | `timestamptz` | trigger-maintained                    |
| `deleted_at`   | `timestamptz` | nullable; soft delete                 |

Soft deletes are preferred for audit-able records. Hard deletes happen via retention jobs only.

## 4. Naming

- Tables: `snake_case`, plural (`companies`, `icp_profiles`, `outreach_messages`).
- Columns: `snake_case`.
- Foreign keys: `<singular>_id` (`workspace_id`, `project_id`, `company_id`).
- Join tables: `<a>_<b>` (`project_target_markets`, `lead_list_companies`).
- Enums stored in Postgres `enum` or as `text` with a `CHECK` constraint (decide per feature).

## 5. Workspace & identity (planned, not yet implemented)

```
workspaces              id, name, created_at, ...
workspace_members       workspace_id, user_id, role ('owner'|'admin'|'member')
users                   mirror of auth.users minimal fields (see auth rules)
```

- Roles are extensible. Foundation roles: `owner`, `admin`, `member`.
- Authorization also enforced in `lib/auth/` server-side; do not rely on RLS alone for app logic.

## 6. Feature tables (high-level, decided at implementation time)

Guidance — not all created in foundation:

- `projects` — SaaS product per workspace.
- `product_analyses` — structured analysis output of a product (versioned).
- `target_markets` — project ↔ country link with selection metadata.
- `market_analyses` — country market analysis, with `sources JSONB`.
- `icp_profiles` — country-specific ICP per project, editable.
- `companies` — discovered/entered companies, workspace-scoped.
- `lead_lists` & `lead_list_companies` — grouping of companies.
- `matches` — deterministic match of company ↔ ICP, persisted with reasons.
- `decision_maker_recommendations` — recommended _roles_ per company (not unlawful PII).
- `outreach_messages` — generated messages (language, subject, body, version).
- `campaigns` & `campaign_outreach` — optional outreach grouping.
- `crm_activities` — timeline entries for a company.
- `ai_runs` — prompt version, model, tokens, cost, status (audit/cost).
- `audit_log` — important mutations (actor, action, target, before/after summary).
- `usage_counters` — per-workspace usage toward plan limits.

## 7. Sourced facts vs. AI interpretation

- Market analysis stores `sources JSONB` (URL, retrieved_at, snippet) alongside AI text.
- AI-generated fields are tagged `is_ai_generated true` / `source_type='ai'`.
- Estimates store `confidence` and `is_estimate=true`.

## 8. Pricing tables (config + DB, but never in components)

- `plans` — stable plan identity (`free|starter|growth|agency`), display name, feature matrix.
- `country_prices` — country code, region fallback, currency, monthly, annual, billing-provider
  price reference, activation status, effective dates.
- Billing country + checkout validation override IP location. See `AGENTS.md` §8.

## 9. Migrations

- Supabase migrations under `supabase/migrations/` (created in Phase 1+).
- Forward-only. Never edit a shipped migration; create a new one.
- Each migration includes its RLS policies in the same file.

## 10. What is NOT allowed

- No client-supplied `workspace_id` trusted blindly. Repositories override/validate it.
- No `SELECT *` in repository code — explicit columns.
- No N+1 from services — batch where needed.
- No ORM other than Supabase client (no Prisma).
- No secrets stored in tables in plaintext; secrets live in env.

# Phase 9 tables

- `workspace_subscriptions`: one authoritative state per workspace. Members read within their
  workspace; only validated service-role provider/webhook flows mutate it.
- `ai_usage_events`: append-only operation metadata. Owner/Admin may read workspace summaries;
  service role inserts. Prompts, generated content, credentials, headers, cookies, and auth tokens
  are prohibited.

Migrations `0033_workspace_subscriptions.sql` and `0034_ai_usage_events.sql` follow 0032, revoke
anon access, enable RLS, and do not alter existing Phase 8 tables.
