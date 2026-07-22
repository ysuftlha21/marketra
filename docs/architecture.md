# Architecture

> System architecture for Marketra. Authoritative on technical shape; conflicts with any other
> doc resolve to `AGENTS.md` then to this file.

## 1. Shape

A single modular **Next.js application** (App Router) on Vercel. Supabase provides PostgreSQL,
Auth, and Storage. No microservices, no separate backend, no GraphQL — all forbidden unless a
Decision Log entry justifies a change.

```
Browser (React Server Components by default)
        │ HTTPS
Next.js (App Router) — server components, route handlers, server actions
   ├── features/<feature>/services      application services (orchestration, no React)
   ├── features/<feature>/domain         pure domain logic (matching engine, etc.)
   ├── features/<feature>/repository     workspace-scoped Supabase data access (RLS enforced)
   └── lib/providers/<name>              external integrations behind interfaces
        │
    Supabase (Postgres + Auth + Storage)
```

## 2. Layering rules (enforced)

| Layer                                   | May contain                                           | May NOT                                                    |
| --------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| `app/` (route handlers, pages, layouts) | HTTP handling, calling services, rendering            | business logic, direct third-party calls, direct DB access |
| `components/`                           | presentational UI, no state beyond UI                 | business logic, direct fetch to providers/DB               |
| `features/*/services`                   | orchestration, calls to repositories/providers/domain | React, raw SQL, model-specific code                        |
| `features/*/domain`                     | pure functions, matching engine, scoring              | I/O, React, Supabase, fetch                                |
| `features/*/repository`                 | Supabase queries, workspace-scoped                    | business decisions, third-party calls                      |
| `lib/providers/*`                       | interfaces + implementations + mocks                  | leaking into services directly                             |
| `features/*/schema`                     | Zod schemas + inferred types                          | runtime I/O                                                |

Dependency direction: `app → services → {domain, repository, providers}`. Domain depends on
nothing. Repository depends on Supabase only. Providers depend on their vendor SDK only.

## 3. Rendering model

- **Server components by default.** All data fetching and mutations run server-side.
- **Client components only when needed**: browser APIs, local interactive state, hooks.
- Use **server actions** for mutations where idiomatic; otherwise route handlers wrap services.
- No secrets reach the client bundle. Only `NEXT_PUBLIC_*` env vars are exposed.

## 4. Multi-tenancy boundary

- `workspace_id` on every tenant-owned row.
- RLS on every tenant-owned table (see `docs/database-rules.md`).
- Server-side authorization resolves the active `workspace_id` from the session and passes it to
  repositories. Repositories never trust a client-supplied `workspace_id`.
- Roles: `owner`, `admin`, `member` (extensible). Permission checks are server-side.

## 5. External integrations

All third-party integrations sit behind one of six provider interfaces. Selection is env-driven,
e.g. `AI_PROVIDER=mock|openai`. Services depend on the interface, never on a concrete vendor.
Foundation ships _interfaces + mocks + extension points_ only; real providers arrive later behind
the same interface. See `docs/provider-architecture.md`.

## 6. AI subsystem

- `AiProvider` is the only place that knows which AI vendor/model is in use.
- Services call `AiProvider` methods returning **Zod-validated** structured JSON.
- Prompts are versioned. Responses are validated. Malformed output is rejected or safely handled.
- Token usage + estimated cost are tracked for audit/cost controls.
- AI never owns factual data: market facts are sourced; match scores are deterministic.
- See `docs/ai-rules.md`.

## 7. Matching engine

- Lives in `features/matching/domain`.
- Pure, deterministic, explainable: criteria → weighted score → positive/negative/missing reasons.
- AI may _explain_ a match in prose, but the numeric score is computed by code, not by AI.
- See `docs/ai-rules.md` §matching.

## 8. Security surface

- Auth via Supabase Auth; server-side session checks; SSRF guard on website fetches.
- Zod on every untrusted boundary. CSV formula-injection guard. Upload type/size limits.
- Rate-limit _extension points_ for expensive actions. Audit log for important mutations.
- See `docs/security-rules.md`.

## 9. Deployment

- Vercel-compatible. Stateless compute. Environment-driven configuration. Static config under
  `src/config/` is data (plans, countries, pricing), not codegen.

## 10. What is deliberately absent

No microservices, no Kubernetes, no GraphQL, no Turborepo, no separate front/back, no Python
backend, no Prisma (Supabase only), no event-driven architecture, no premature abstractions.

## 11. Outreach draft workflow

Outreach generation remains synchronous while the deterministic Mock provider is active. Generation
runs preserve snapshots and produce a current draft plus immutable history. Edits and restores are
atomic PostgreSQL operations guarded by the caller's expected version; review transitions are
server-validated and Owner/Admin-only. RLS scopes drafts and versions to workspace members, and
repository queries use tenant filters and bounded result sets. A real slow provider requires a
durable worker before detached execution is permitted.

# Phase 9 production integration boundaries

Real OpenAI execution is isolated in a shared structured client used by `OpenAiProvider` and
`OpenAiOutreachProvider`. Application services see only provider-neutral results and metadata.
Workspace subscriptions are persisted provider-neutral state; entitlement resolution never reads
plan IDs from the browser. AI usage events contain dimensions, token counts, duration, known cost,
and controlled errors—never prompts or generated bodies. Abuse rate limiting is separate from plan
usage and keyed by workspace, user, and operation.

Manual entry creates a completed `manual` discovery run and then uses the existing `companies` and
`project_companies` pipeline. In-memory rate limiting is local/test-only.
