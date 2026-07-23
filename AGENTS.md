# AGENTS.md — Marketra Permanent Instructions

This file is the **primary instruction file** for all OpenCode tasks in the Marketra repository.
It is intentionally concise but authoritative. The files referenced under `docs/` are permanent
extensions of these rules and must be read and obeyed alongside this file.

OpenCode loads the docs below via `opencode.json` (`instructions`). When a doc and this file
conflict, **this file wins**. Update both together when changing a rule deliberately.

---

## 1. What Marketra is

Marketra is an AI-powered market-entry, customer-discovery and go-to-market platform for SaaS
founders. A founder adds their SaaS product, selects target countries, and Marketra analyzes
the product + market, generates country-specific ICPs, discovers and scores matching companies,
recommends decision-maker roles, generates localized outreach, and tracks everything in a
lightweight CRM.

The **application UI is English-only**. Outreach may be generated in the target market's local
language. Pricing is country/region-specific and **never hardcoded** into components.

## 2. Stack (do not change without a Decision Log entry)

- TypeScript strict mode (no `any`, no `ts-ignore` to hide errors)
- Next.js (App Router), React, server components by default
- Supabase (PostgreSQL, Auth, Storage) with Row Level Security
- Tailwind CSS + shadcn/ui (Radix + Lucide)
- Zod + React Hook Form for validation/forms
- Vitest (unit/integration) + Playwright (e2e)
- Vercel-compatible deployment, npm

Forbidden unless explicitly approved later: microservices, GraphQL, Turborepo, separate
front/back ends, Python backend, Prisma, event-driven architecture, premature abstractions.

## 3. Source organization (feature-first, layered)

```
src/
  app/                    Next.js App Router (route handlers, layouts, pages)
  components/             UI components only — NO business logic
    ui/                   shadcn/ui primitives
    [feature]/            feature-scoped presentational components
  features/               business feature areas (auth, projects, icp, ...)
    [feature]/
      api/                route handler wrappers / server actions
      services/           application services (orchestration)
      domain/             pure domain logic (no I/O, no React)
      schema/             Zod schemas + inferred types
      repository/         data access (Supabase, workspace-scoped)
  lib/
    providers/            provider interfaces + implementations + mocks
      ai/  leads/  market/  billing/  email/  analytics/
    db/                   Supabase client, RLS helpers, server client
    auth/                 session + workspace resolution
    security/             SSRF guards, file/CSV guards, rate-limit points
    utils/                shared utilities
  config/                 static config (plans, countries, pricing) — data, not codegen
docs/                     permanent documentation
tests/                    e2e (Playwright) and shared test utilities
```

Rules:

- **No business logic in React components or route handlers.** They call services.
- **No direct third-party calls in application logic.** Everything goes behind a provider interface.
- Repositories are the only place that touches Supabase tables. Every query is workspace-scoped.
- Every tenant-owned record carries `workspace_id`. RLS + server-side authorization enforce it.

## 4. Provider architecture

Six required provider interfaces (in `lib/providers/<name>/`):

1. `AiProvider` — OpenAiProvider (planned), MockAiProvider (default in foundation)
2. `LeadProvider` — Manual / Csv / External / Mock
3. `MarketIntelligenceProvider`
4. `BillingProvider` — Stripe / PayTR / Iyzico / Mock
5. `EmailProvider`
6. `AnalyticsProvider`

Only interfaces, mocks, and clean extension points exist in the foundation phase. Real providers
arrive behind their interface later. Selection is config/env-driven, never hardcoded.

## 5. AI rules (summary — full text: docs/ai-rules.md)

- First real provider: OpenAI `gpt-4o-mini` (via `OPENAI_MODEL` env).
- Keep OpenAI code inside `OpenAiProvider` only. Never leak model specifics into services.
- Prompts are versioned. AI responses are validated with Zod. Structured JSON requested.
- Timeouts, limited retries w/ exponential backoff, token/cost tracking.
- AI may **never** invent companies, contacts, market figures, or citations.
- Separate sourced facts from AI interpretation. Tag estimates clearly. Attach sources.
- The full match score is **deterministic and explainable** — AI only assists explanation, never
  determines the score secretly. See `docs/ai-rules.md`, `docs/` matching section.

## 6. Multi-tenancy & security

- Workspace-based multi-tenancy from day one. `workspace_id` on all tenant-owned rows.
- Supabase RLS is mandatory. Never rely on frontend filtering alone.
- Roles: `owner`, `admin`, `member` (extensible, keep simple now).
- Zod-validate all untrusted input. SSRF guard on website fetches (block localhost/private/
  metadata/unsafe redirects). File type+size limits on uploads. Formula-injection guard on CSV.
- No secrets in client bundles, logs, or errors. No automatic LinkedIn actions. No scraping of
  personal data from unlawful sources. Rate-limit extension points for expensive actions.
- Audit log important mutations. Document retention/deletion.

## 7. Design system

Original premium B2B SaaS look: modern, minimal, data-focused, spacious, responsive, accessible,
polished in **light + dark**. Restrained design tokens (color, type, spacing, radius, border,
shadow, motion, charts). Avoid heavy gradients/glassmorphism/random bright colors/bloat.
Every data component must handle: loading / empty / error / success / disabled / permission-denied.
Desktop first for the dashboard; tablet + mobile must work. See `docs/design-system.md`.

## 8. Pricing rules

Plans identified by stable IDs: `free`, `starter`, `growth`, `agency`. Plan _identity_ is
separate from country _price_. Country price records carry: country code, optional region
fallback, currency, monthly amount, annual amount, billing-provider price reference, activation
status, effective dates. Billing country + checkout validation are authoritative — **not** IP
location. Pricing data lives in schema/config, never baked into components.

## 9. Quality bar for every task

- TypeScript strict stays on. No `any` without a documented boundary. No `ts-ignore` shortcuts.
- No oversized files/components. No duplicated business logic. Descriptive names.
- Comments only where they explain non-obvious intent.
- No placeholder code presented as finished. Never fabricate a successful command/test result.

## 10. Definition of done — run before claiming a feature is complete

```pwsh
npm run lint; if ($?) { npm run typecheck }
npm run test:unit
npm run test:integration      # when relevant
npm run build
npm run test:e2e -- <suite>   # when the feature is testable end to end
```

Do not delete, skip, or weaken a failing test to make the pipeline green. Fix the cause.

## 11. Workflow

- Inspect, plan, then act. Don't wait for confirmation unless genuinely blocked.
- Never commit unless explicitly asked.
- Never push or open PRs unless explicitly asked.
- Record any deviation from these rules as an entry in `docs/decision-log.md` with rationale.
- Update `docs/decision-log.md` and the affected `docs/` file together when a rule changes.

## 12. Required reading (loaded automatically by opencode.json)

- `docs/product-overview.md` — product definition
- `docs/mvp-scope.md` — in/out of scope
- `docs/architecture.md` — system architecture
- `docs/folder-structure.md` — directory contracts
- `docs/database-rules.md` — schema/RLS rules
- `docs/provider-architecture.md` — provider abstraction
- `docs/ai-rules.md` — AI usage rules
- `docs/security-rules.md` — security rules
- `docs/design-system.md` — design tokens and states
- `docs/coding-standards.md` — code conventions
- `docs/testing-guidelines.md` — test strategy
- `docs/development-workflow.md` — task workflow
- `docs/phase-plan.md` — bounded phases
- `docs/decision-log.md` — decisions

## 13. Current delivery phase

Phases 0–9 are complete. Phase 10 hardens closed-beta access, provider operations, security
headers, health checks, provenance, legal surfaces, and launch operations. Real-provider activation,
production migrations, and rollback remain operator-controlled actions.
