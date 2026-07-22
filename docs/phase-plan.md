# Phase Plan

> Bounded, testable phases. Each phase ends green: lint + typecheck + tests + build + relevant e2e.
> Foundation (this phase) creates instruction + docs + plan only. See `AGENTS.md` §13.

## Phase 0 — Foundation (this phase)

**Goal:** permanent instruction set, product documentation, engineering plan. **No application
code, no DB tables, no auth, no AI, no features.**

Deliverables:

- `AGENTS.md`, `opencode.json`, `README.md`, `.env.example`, `.gitignore`.
- `docs/` rule + architecture documentation (all 14 docs below).
- `docs/phase-plan.md` and `docs/decision-log.md`.

Done when:

- All files exist; JSON validates; docs cross-consistent; no contradictions with `AGENTS.md`.
- Decision Log seeded with foundational decisions.

## Phase 1 — Project scaffold & infra plumbing

**Goal:** runnable Next.js app on mocks, no business features yet.

Tasks:

1. Scaffold Next.js (App Router, TS strict) + Tailwind + shadcn/ui base.
2. `tsconfig` path aliases; ESLint + Prettier; Vitest + Playwright config.
3. `src/config/` static plan/country/pricing data modules + Zod pricing schema.
4. `lib/db/` Supabase browser + server client shells (typed; no real schema yet).
5. `lib/auth/` session + workspace resolution stubs.
6. `lib/security/` SSRF guard + CSV guard + file guard + rate-limit extension points.
7. Provider interfaces + mocks + factories for all six providers.
8. App shell layout (light/dark), empty/loading/error/permission-denied primitives.
9. npm scripts: `lint`, `typecheck`, `test:unit`, `test:integration`, `build`, `test:e2e`.

Done when: `npm run dev` runs on mocks; `lint`, `typecheck`, `test:unit`, `build` pass; contract
tests for all provider mocks pass.

## Phase 2 — Auth, workspaces, users

- Supabase Auth (email + magic link/OAuth) + workspace creation + roles.
- RLS scaffolding for `workspaces`, `workspace_members`, `users`.
- Authorization tests (service + tenant isolation).

## Phase 3 — Projects & product analysis

- Project CRUD.
- SSRF-guarded website fetch + structured product analysis via `AiProvider` (mock default).
- `ai_runs` tracking (tokens, cost, prompt version).
- Versioned product analyses stored.

## Phase 4 — Target markets & market analysis

- Target country selection per project.
- Country market analysis via `MarketIntelligenceProvider` (mock default) with `sources JSONB`.
- Country comparison view.

## Phase 5 — ICP generation & editing

- Country-specific ICP generation via `AiProvider` (Zod-validated).
- ICP editing by founder.

## Phase 6 — Companies, lead discovery, enrichment

- Manual company entry.
- CSV import with formula-injection guard.
- One external `LeadProvider` (replaceable) + company enrichment.
- Lead lists.

## Phase 7 — Matching & decision-makers

- Deterministic matching engine in `features/matching/domain` with full unit tests.
- Match explanations (positives/negatives/missing).
- AI-assisted readable explanation (optional, never owns the score).
- Decision-maker _role_ recommendations.

## Phase 8 — Outreach & lightweight CRM

- Localized outreach generation (English / local / both) via `AiProvider`.
- CRM: companies, activities, statuses, per workspace.
- Optional campaigns grouping.

### Phase 8 delivery

- **8.1 Architecture:** dedicated `OutreachProvider`, typed contracts, deterministic Mock provider,
  generation-run persistence, workspace usage enforcement, and safe error mapping.
- **8.2 Generation:** synchronous single-company generation from an approved Decision Role. Each
  successful run creates a draft and immutable version 1. A future non-Mock provider requires a
  durable worker before asynchronous execution is enabled.
- **8.3 Draft workflow:** edits and historical restores append immutable versions through an
  optimistic-concurrency PostgreSQL function. Lifecycle states are `draft`, `approved`, `rejected`,
  and `archived`; Owner/Admin review while Members may generate and edit. Approved edits create a
  new version and reset status to draft. The workspace dashboard uses URL-backed filters and bounded
  pagination. Non-generation operations do not consume generation usage.
- Usage resolution intentionally keeps the typed Free-plan fallback until Phase 9 provides a
  persisted BillingProvider subscription source.

## Phase 9 — Billing, usage, admin, audit

- Country-specific pricing + checkout via `BillingProvider`.
- Subscription architecture + webhooks (verified).
- Usage limits + counters; per-workspace daily AI caps.
- Admin foundation; audit log; cost tracking reports.

## Phase 10 — Hardening & release readiness

- Performance, accessibility pass, full light/dark parity.
- E2E suites green for each critical flow.
- Observability wiring, error tracking hooks.
- Data retention/deletion tooling.

---

## Phase principles

- Each phase ends green. No phase ships with failing/skipped tests.
- Each phase is independently testable; prefer vertical slices over horizontal layers.
- Mocks first, real providers behind the same interface contract later.
- AI never owns facts or the match score. Update `docs/decision-log.md` on any deviation.
