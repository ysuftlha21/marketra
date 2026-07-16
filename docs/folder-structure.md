# Folder Structure

> Directory contracts for Marketra. Treat the tree below as authoritative. Adding a new top-level
> directory requires a Decision Log entry.

## Tree

```
src/
  app/                    Next.js App Router — route handlers, layouts, pages
    (public)/            marketing / unauthenticated routes (later)
    (app)/               authenticated workspace app (later)
    api/                 route handlers (thin wrappers over services)
  components/
    ui/                   shadcn/ui primitives (Radix + Lucide + Tailwind)
    [feature]/            feature-scoped presentational components (no business logic)
  features/
    auth/
    workspaces/
    users/
    projects/
    product-analysis/
    target-markets/
    market-analysis/
    icp/
    companies/
    lead-discovery/
    matching/
    decision-makers/
    outreach/
    campaigns/
    crm/
    billing/
    usage/
    admin/
    audit/
      api/                route handler wrappers / server actions
      services/           application services (orchestration)
      domain/             pure domain logic (no I/O, no React)
      schema/             Zod schemas + inferred types
      repository/         data access (Supabase, workspace-scoped)
  lib/
    providers/
      ai/                 AiProvider + OpenAiProvider + MockAiProvider
      leads/              LeadProvider + Manual/Csv/External/Mock
      market/             MarketIntelligenceProvider + mocks
      billing/            BillingProvider + Stripe/PayTR/Iyzico/Mock
      email/              EmailProvider + mocks
      analytics/          AnalyticsProvider + mocks
    db/                   Supabase client, server client, RLS helpers
    auth/                 session + workspace resolution
    security/             SSRF guards, file/CSV guards, rate-limit points
    utils/                shared utilities
  config/                 static config — plans, countries, pricing (data, not codegen)
docs/                     permanent documentation
tests/
  e2e/                     Playwright suites
  utils/                  shared test utilities
```

## Contracts

### `src/app/`

- Route handlers and pages are **thin**. They parse/validate input, call a service, render the
  result. No business logic here, no direct provider calls, no direct SQL.

### `src/components/`

- UI only. No business logic. No direct data fetching that bypasses services.
- `ui/` holds shadcn/ui primitives. Feature components go under `components/<feature>/`.
- Every data component handles: loading / empty / error / success / disabled / permission-denied.

### `src/features/<feature>/`

- The heart of each feature. Four subfolders per feature:
  - `api/` — server actions and route-handler wrappers (call services only).
  - `services/` — orchestration. Calls `repository`, `domain`, `providers`. No React, no SQL.
  - `domain/` — pure logic. No I/O, no React, no Supabase. The matching engine lives here.
  - `schema/` — Zod schemas + inferred types (`z.infer`).
  - `repository/` — the _only_ place that touches Supabase tables. Every query is
    workspace-scoped and server-side authorized.

### `src/lib/providers/<name>/`

- One folder per provider. Each contains an interface, one or more implementations, a mock, and a
  factory selected via env. Services import the interface, never a concrete vendor class.

### `src/lib/db/`

- Supabase browser and server clients. The server client uses the service role key **on the server
  only**. RLS helpers. The browser client never holds the service role key.

### `src/lib/auth/`

- Session resolution, workspace resolution, role checks. Server-side only for authorization.

### `src/lib/security/`

- SSRF guard (block localhost, private, metadata, unsafe redirects). File upload guards.
- CSV formula-injection guard. Rate-limit _extension points_.

### `src/config/`

- Static config: plans, countries, pricing. Plain data modules. Not generated, not embedded in
  components. Pricing must be read through a schema/config layer, never hardcoded.

### `docs/`

- Permanent documentation. Loaded by `opencode.json` `instructions`.

### `tests/`

- `e2e/` for Playwright. `utils/` for shared test helpers. Unit/integration tests live beside
  features (co-located) following Vitest conventions, unless a feature spans folders.

## Naming

- Directories: `kebab-case`.
- Component files, types, functions: `PascalCase` for components, `camelCase` for functions and
  variables, `SCREAMING_SNAKE_CASE` for env-only constants.
- One primary export per file where practical.
