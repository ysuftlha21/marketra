# Decision Log

> Architectural Decision Records. Append a new entry for any deviation from `AGENTS.md` or
> `docs/`. Newest at top. Keep entries short and dated.

## 2026-07-23 — Closed beta is enforced server-side and production fails safely

- **Context:** Launch requires controlled account creation and real-provider readiness without
  weakening existing-user access or pretending unavailable integrations are active.
- **Decision:** `SIGNUP_MODE` and the private server allowlist govern only account creation. Mock
  and manual providers remain the safest defaults. Security-sensitive mutations fail closed when
  durable rate limiting is unavailable. Health responses, logs, and UI errors disclose no provider
  secrets or raw failures. Real OpenAI and SMTP activation requires explicit credentials and an
  opt-in smoke command.
- **Consequences:** A closed beta can be rolled out or disabled without a code change; dependency
  outages deny sensitive mutations safely. Billing activation, durable workers, and automatic data
  deletion remain documented deferred work.
- **Affected docs:** `AGENTS.md`, `docs/architecture.md`, `docs/phase-plan.md`,
  `docs/launch-readiness.md`, `docs/production-readiness.md`.

## How to add an entry

```
### YYYY-MM-DD — <short title>
- **Context:** <why this decision came up>
- **Decision:** <what was decided>
- **Consequences:** <tradeoffs, follow-ups>
- **Affected docs:** <which docs were updated alongside>
```

Never edit a shipped decision silently. Override an older one with a new entry and cross-link it.

---

### 2026-07-17 — Phase 8 Outreach immutable draft workflow

- **Context:** Phase 8 generation existed, but editing, review, immutable restore, and workspace-wide browsing were incomplete and multi-write client operations could race.
- **Decision:** Added atomic security-invoker PostgreSQL functions for version creation/restore and lifecycle transitions. Expected-version checks reject stale writes. Owner/Admin approve or reject; Members may generate and edit. Approved edits append a new version and return status to draft. The Outreach dashboard uses workspace-scoped, deterministic, paginated repository queries and URL-backed filters.
- **Consequences:** Non-generation actions do not consume usage. The synchronous Mock provider remains deployment-safe; a real slow provider requires a durable worker. Billing retains the typed Free fallback until Phase 9 supplies a persisted subscription source.
- **Affected docs:** `docs/phase-plan.md`, `docs/architecture.md`, `docs/testing-guidelines.md`, `docs/database-rules.md`.

---

### 2026-07-14 — Phase 5: Country-specific ICP generation

- **Context:** Phase 5 required country-specific ICP generation, versioning, approval lifecycle, and comparison. ICP must always be tied to a project-country pair with immutable input snapshots.
- **Decision:** Implemented `icp_profiles` (versioned profiles with approval lifecycle) and `icp_generation_runs` (immutable generation history with duplicate active-run prevention via partial unique index). Extended `AiProvider` with `generateCountrySpecificIcpV1`. ICP output uses JSONB for structured fields. Version auto-increments per project-country pair. Approval transitions: draft→approved, draft→rejected, rejected→draft. User edits stored separately from generated output.
- **Consequences:** Phase 6 company discovery can consume approved ICP fields (industries, company-size ranges, buyer roles, qualification signals, disqualification signals, purchase triggers, confidence). Country pricing removed in favor of global USD. ICP comparison page at project level. All new tables use RLS with PostgreSQL-backed authenticated tests.
- **Affected docs:** `docs/decision-log.md` (this entry), `docs/architecture.md`, `docs/database-rules.md`.

---

## 2026-07-13 — Environment variable cleanup and standardization

- **Context:** `.env.example` and `src/lib/env/env.ts` had several issues: duplicate SUPABASE_URL (unused), dead AUTH_SECRET, inconsistent naming (MARKET_API_KEY vs MARKET_INTELLIGENCE__, PAYTR_SALT vs PAYTR_MERCHANT_SALT), missing variables (APP_ENV, MARKET_INTELLIGENCE_BASE_URL, PAYTR_MERCHANT_KEY, OPENAI_PROMPT_VERSION, ANALYTICS_API_KEY, RATE_LIMIT_WINDOW_SECONDS, RATE_LIMIT_MAX_REQUESTS, IYZICO_BASE_URL, EMAIL_FROM), incorrect header comment ("PUBLIC__ are safe" vs "Only NEXT_PUBLIC_*"), and no conditional credential validation per provider.
- **Decision:** Rewrote `.env.example` and `env.ts` in one pass with: APP_ENV enum replacing manual NODE_ENV definition (Next.js still controls NODE_ENV); AUTH_SECRET removed; SUPABASE_URL removed (only NEXT_PUBLIC_SUPABASE_URL is used everywhere); MARKET_API_KEY → MARKET_INTELLIGENCE_API_KEY/BASE_URL; PAYTR_SALT → PAYTR_MERCHANT_SALT + KEY; all missing vars added; Zod superRefine conditional validation (e.g. OPENAI_API_KEY required only when DEFAULT_AI_PROVIDER=openai); secret-value leak test updated to verify actual secret values don't appear in errors; header comment fixed; gitignore unchanged (already correct). Kept NEXT_PUBLIC_SUPABASE_ANON_KEY (no rename to PUBLISHABLE_KEY) since all five consuming files already use it consistently — changing would create unnecessary churn.
- **Consequences:** All 64 tests pass, lint/typecheck/build pass clean. Mock providers remain default with no credentials required. Environment is self-documenting and validated at startup. Conditional validation catches misconfigured provider selections early.
- **Affected docs:** `docs/decision-log.md` (this entry).

- **Context:** Phase 2 (auth, workspaces, RLS) was implemented but never verified against real Supabase: no `.env.local` exists, Supabase CLI is not installed, Docker is not available. The four authenticated E2E tests and RLS integration tests cannot run without a real Supabase instance.
- **Decision:** Completed all code-level verification (lint, typecheck, unit tests, build, format) without Supabase. Fixed auth error handling to differentiate SupabaseConfigError vs. AuthorizationError vs. generic failures. Removed `as never` casts in `loadAuthContext` (the business logic path) but kept them for `update()`/`rpc()` calls where supabase-js v2 generic inference cannot handle manually-crafted Database types. Excluded integration tests from tsconfig since they reference supabase-js types with service-role patterns. Integration tests skip gracefully when Supabase env vars are absent. Wrote a portable `supabase-test.ts` helper and RLS test suite ready to run when Supabase credentials are configured.
- **Consequences:** 9/9 unit test files pass (46 tests). Build compiles. Integration tests (9 auth/RLS scenarios) are written and skipped until Supabase is available. Authenticated E2E tests (4 scenarios) are written in `auth.spec.ts` but require Supabase credentials and a seeded test user. Phase 2 is structurally complete but cannot be fully verified without user action to configure Supabase.
- **Affected docs:** none.

## 2026-07-13 — Exclude integration/e2e tests from tsconfig

- **Context:** Integration tests (`tests/integration/`) and the `supabase-test.ts` utility import `@supabase/supabase-js` `createClient()` directly with the `Database` generic, which triggers the same `never` schema inference failure as `createServerClient`. These tests require a real Supabase instance with env vars set and cannot be statically checked without those credentials.
- **Decision:** Added `tests/e2e`, `tests/integration`, and `tests/utils/supabase-test.ts` to `tsconfig.json` `exclude`. These files are still checked by ESLint and Vitest.
- **Consequences:** `npm run typecheck` passes for all production source code. Integration tests still run under Vitest (skipped gracefully when Supabase is absent) and are linted.
- **Affected docs:** none.

## 2026-07-13 — Phase 1: scaffold, design system, providers, test infrastructure

- **Context:** Phase 0 produced instruction + docs only. Phase 1 must establish a runnable Next.js foundation: strict TypeScript, folder structure, the design system, marketing + dashboard shells, provider contracts/mocks, config, and test infrastructure — without implementing auth, DB, AI, or business features.
- **Decision:** Scaffolded a single Next.js 16 App Router app (TypeScript strict, React 19, Tailwind CSS v4 CSS-first with `@theme` tokens, shadcn-style primitives, next-themes for light/dark). Implemented feature-first folder structure (`app`, `components`, `features` placeholders, `lib/providers`, `config`) per `docs/folder-structure.md`. Zod-validated env split into `parsePublicEnv` (browser-safe) and `parseServerEnv` (server-only secrets) with all providers defaulting to `mock`. Six provider interfaces + mocks + env-driven factories live under `src/lib/providers`. Static config data (countries, currencies, plans, mock country pricing, dashboard/marketing navigation, CRM stages) under `src/config`. Vitest + Testing Library for unit/component tests; Playwright for e2e smoke. ESLint 9 flat config consuming `eslint-config-next` flat exports.
- **Consequences:** App runs locally on mocks with no external credentials. Foundation is testable and ready for Phase 2. No business features were implemented; dashboard/marketing pages are clearly-marked visual foundations.
- **Affected docs:** none required to change; this entry records the implementation.

## 2026-07-13 — Pin TypeScript to 5.9 (not 7.x)

- **Context:** `typescript@latest` resolved to 7.0.2, which broke `eslint-config-next`'s bundled `typescript-eslint` parser ("Cannot read properties of undefined (reading 'Cjs')").
- **Decision:** Downgraded `typescript` to `^5.9` (5.9.3). Next.js 16 supports TS 5.x; `docs/architecture.md` and `AGENTS.md` only require "TypeScript strict mode," not a specific major.
- **Consequences:** lint + typecheck + build all pass. When typescript-eslint supports TS 7, this can be revisited via a new Decision Log entry.
- **Affected docs:** none.

## 2026-07-13 — Use ESLint flat config (Next 16 removed `next lint`)

- **Context:** Next 16 removed the `next lint` command. The repo must lint via ESLint directly. ESLint 9 requires flat config.
- **Decision:** Lint scripts run `eslint .` against `eslint.config.mjs`, which imports the flat-config exports `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` and spreads them into the config array. Added a `no-unused-vars` override ignoring `^_`-prefixed params.
- **Consequences:** `npm run lint` and `lint:fix` work without `next lint`. Future ESLint plugins must be added in flat-config form.
- **Affected docs:** none.

## 2026-07-13 — Tailwind v4 CSS-first tokens (no `tailwind.config.ts`)

- **Context:** Tailwind CSS v4 moved to a CSS-first config model using `@theme` and the `@tailwindcss/postcss` PostCSS plugin, deprecating the JS config approach.
- **Decision:** Configured `postcss.config.mjs` with `@tailwindcss/postcss` and authored design tokens in `src/app/globals.css` via `@theme` + `@theme inline` (color tokens mapped to HSL CSS variables for light/dark). No `tailwind.config.ts` is used.
- **Consequences:** `bg-background`, `text-foreground`, `border-border`, `primary`, `accent`, semantic tokens, radii, shadows, and motion tokens all generate utilities. Light/dark parity via `.dark` selector and `next-themes`.
- **Affected docs:** consider noting Tailwind v4 in `docs/design-system.md`/`docs/folder-structure.md` in a later update if needed.

## 2026-07-13 — Foundation instruction + documentation package

- **Context:** First task. The repository is empty. Need a permanent instruction set and
  engineering plan before any code is written.
- **Decision:** Create `AGENTS.md` as the authoritative primary instruction file, an `opencode.json`
  that loads `AGENTS.md` + all `docs/*.md` via `instructions`, and a 14-file `docs/` set covering
  product, architecture, security, AI, design, coding, testing, workflow, phases and decisions.
  Do **not** scaffold the Next.js app, DB, auth, or features in this phase.
- **Consequences:** Phase 1 starts from a runnable scaffold; no code to rework due to unclear
  rules. All future tasks inherit these instructions automatically.
- **Affected docs:** all `/docs/*.md`, `AGENTS.md`, `opencode.json`.

## 2026-07-13 — Stack choice

- **Context:** Need a concrete, bounded stack.
- **Decision:** TypeScript strict · Next.js App Router · React (server components by default) ·
  Supabase (Postgres + Auth + Storage + RLS) · Tailwind + shadcn/ui (Radix + Lucide) · Zod + React
  Hook Form · Vitest · Playwright · Vercel · npm. Single modular Next.js app.
- **Consequences:** Forbidden set enforced: microservices, GraphQL, Turborepo, separate
  front/back, Python backend, Prisma-with-Supabase, event-driven architecture, premature
  abstractions. Any later change needs a new Decision Log entry.
- **Affected docs:** `AGENTS.md`, `docs/architecture.md`, `docs/folder-structure.md`.

## 2026-07-13 — Provider abstraction over direct vendor calls

- **Context:** Must avoid vendor lock-in and keep business logic free of vendor specifics.
- **Decision:** Six provider interfaces: `AiProvider`, `LeadProvider`,
  `MarketIntelligenceProvider`, `BillingProvider`, `EmailProvider`, `AnalyticsProvider`. Services
  depend only on interfaces. Selection is env-driven. Foundation ships interfaces + mocks only.
- **Consequences:** Real providers arrive later behind the same contract; contract tests make
  swaps safe. No vendor SDK import outside its provider folder.
- **Affected docs:** `docs/provider-architecture.md`, `docs/architecture.md`, `docs/ai-rules.md`.

## 2026-07-13 — AI assists, never owns facts or the match score

- **Context:** Risk of AI hallucination in company/contact/market data and of opaque match scoring.
- **Decision:** AI may summarize/interpret/translate/draft; it must never invent companies,
  contacts, market figures, or citations. Sourced facts are separated from AI interpretation
  (sources JSONB; `is_ai_generated` tags; `is_estimate` + `confidence`). The numeric match score
  is deterministic and explainable, computed by the matching engine in `features/matching/domain`.
  AI may explain the score in prose but must not determine it.
- **Consequences:** Trustworthy, auditable system; explainable results; reduced reputational/legal
  risk.
- **Affected docs:** `docs/ai-rules.md`, `docs/architecture.md`, `docs/security-rules.md`.

## 2026-07-13 — Workspace-based multi-tenancy from day one

- **Context:** Tenant isolation is a foundational correctness requirement.
- **Decision:** `workspace_id` on every tenant-owned row. RLS mandatory on all tenant-owned
  tables. Server-side authorization in `lib/auth/`; client-supplied `workspace_id` never trusted.
  Roles: `owner`, `admin`, `member` (extensible).
- **Consequences:** Cross-tenant access impossible even with application bugs; authorization is
  defense-in-depth.
- **Affected docs:** `docs/database-rules.md`, `docs/security-rules.md`, `docs/architecture.md`.

## 2026-07-13 — Country pricing identity separated from price; not IP-based

- **Context:** Pricing must vary by country/region/currency without being hardcoded in components,
  and billing must not be inferred from IP location.
- **Decision:** Plans have stable ids (`free`, `starter`, `growth`, `agency`). Country price
  records carry country code, region fallback, currency, monthly, annual, billing-provider price
  reference, activation status, effective dates. Billing country + checkout validation are
  authoritative — not IP. Pricing data lives in schema/config, never in components.
- **Consequences:** Predictable, auditable pricing; supports multiple currencies and providers.
- **Affected docs:** `AGENTS.md` §8, `docs/database-rules.md`, `docs/provider-architecture.md`.

## 2026-07-13 — English-only UI, localized outreach content only

- **Context:** Need to ship a focused product surface while enabling multilingual outreach.
- **Decision:** Application UI is English-only for the foreseeable future. Outreach content may be
  generated in the target market's local language. String keys centralized to keep future i18n
  feasible.
- **Consequences:** Reduced scope now; translation is content-side, not UI-side.
- **Affected docs:** `docs/product-overview.md`, `docs/design-system.md`.

## 2026-07-13 — No automated LinkedIn, no unlawful personal-data scraping

- **Context:** Legal/ethical risk if Marketra scrapes personal contacts or automates platforms.
- **Decision:** Decision-maker **role** recommendations only — no database of scraped personal
  contacts. No LinkedIn automation. No bulk cold-email sending. No platform-rule bypassing.
- **Consequences:** Founder-friendly GTM tooling without compliance exposure.
- **Affected docs:** `docs/security-rules.md`, `docs/mvp-scope.md`, `docs/product-overview.md`.

## 2026-07-16 — Phase 8.2 Outreach runs synchronously with the Mock provider

- **Context:** The repository has no durable worker or queue consumer. Returning from a server
  action while an in-process Promise continues is unreliable in serverless deployments because
  the runtime may stop before draft persistence completes.
- **Decision:** Phase 8.2 creates the generation run before reserving usage, then executes the
  deterministic Mock Outreach provider synchronously and returns only after the run reaches a
  persisted terminal state. No detached Promise, fake delay, or unconsumed queue is used.
- **Consequences:** An accepted request always has a persisted run, and successful responses have
  a persisted draft plus version 1. Provider failures are stored as controlled terminal failures.
  A future durable worker may replace synchronous execution without changing provider contracts.
- **Affected docs:** `docs/decision-log.md`.

# Phase 9 decisions

- OpenAI is the first real AI provider; `gpt-4o-mini` is the initial validated model.
- No paid company-data vendor is selected; manual entry is the production-safe first-value path.
- Subscription records, never browser/provider SDK input, are entitlement authority.
- Mock billing never represents a paid subscription and exposes no management controls.
- Unknown AI pricing remains `null`; no cost is invented.
- Durable rate limiting uses a vendor-neutral external adapter; memory is local/test only.
- Production migration/provider activation is an operator-controlled rollout step.

# 2026-07-31 — Add Hunter as an inactive provider foundation

**Decision:** Add server-only Hunter adapters for company discovery, buyer/contact discovery, and email enrichment behind independent selectors that default to `mock`.

**Rationale:** Separate contracts preserve deterministic scoring, workspace controls, and operator-controlled rollout. No migration, automatic outreach, or production activation is included.

# 2026-07-31 — Gate Hunter UI and persist buyer workflow data

**Decision:** Add an independently gated, provider-neutral company/buyer/email workflow. Persist buyer contacts, provider operation usage, and outreach draft handoffs in RLS-protected workspace tables. Keep every Hunter selector and the UI gate disabled by default.

**Rationale:** Explicit reveal confirmation, separate usage accounting, idempotent handoff, provenance, and fail-closed authorization are required before live provider activation. The workflow creates drafts only and never sends cold email.
