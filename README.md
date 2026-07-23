# Marketra

AI-powered market-entry, customer-discovery and go-to-market platform for SaaS founders.

Marketra helps a SaaS founder add their product, select target countries, analyze each market,
generate country-specific ideal customer profiles (ICPs), discover and score matching companies,
recommend decision-maker roles, generate localized outreach, and manage everything in a lightweight
CRM.

## Status

Phases 0–9 are complete. Phase 10 launch hardening is implemented on its feature branch behind
Mock/manual-safe defaults and operator-controlled provider activation. See
`docs/launch-readiness.md`; no real provider is claimed active without credentials and its explicit
smoke test.

## Documentation

All permanent rules and architecture documentation live under `docs/`. The authoritative summary
is `AGENTS.md`, which OpenCode loads as the primary instruction file.

| Document                        | Purpose                                |
| ------------------------------- | -------------------------------------- |
| `AGENTS.md`                     | Primary instruction file for all tasks |
| `docs/product-overview.md`      | Product definition                     |
| `docs/mvp-scope.md`             | In/out of MVP scope                    |
| `docs/architecture.md`          | System architecture                    |
| `docs/folder-structure.md`      | Directory contracts                    |
| `docs/database-rules.md`        | Schema & RLS rules                     |
| `docs/provider-architecture.md` | Provider abstraction                   |
| `docs/ai-rules.md`              | AI usage rules                         |
| `docs/security-rules.md`        | Security rules                         |
| `docs/design-system.md`         | Design tokens & states                 |
| `docs/coding-standards.md`      | Code conventions                       |
| `docs/testing-guidelines.md`    | Test strategy                          |
| `docs/development-workflow.md`  | Task workflow                          |
| `docs/phase-plan.md`            | Bounded phases                         |
| `docs/production-readiness.md`  | Phase 9 rollout and operator steps     |
| `docs/launch-readiness.md`      | Phase 10 launch and recovery runbook   |
| `docs/decision-log.md`          | Architectural decision records         |

## Stack

TypeScript (strict) · Next.js (App Router) · React · Supabase (PostgreSQL, Auth, Storage, RLS) ·
Tailwind CSS · shadcn/ui (Radix + Lucide) · Zod · React Hook Form · Vitest · Playwright · Vercel · npm

## Quick start (planned, Phase 1 onward)

> The application is not scaffolded yet. Once Phase 1 begins:

```pwsh
npm install
npm run dev
```

Environment variables are documented in `.env.example`.

## Definition of done

Every feature must pass before being considered complete:

```pwsh
npm run lint; if ($?) { npm run typecheck }
npm run test:unit
npm run test:integration      # when relevant
npm run build
npm run test:e2e -- <suite>   # when testable end to end
```

Never weaken a failing test to make the pipeline green. Fix the cause.

## License

Proprietary. All rights reserved.
