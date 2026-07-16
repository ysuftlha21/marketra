# Coding Standards

> Code conventions for Marketra. Conflicts resolve to `AGENTS.md`.

## 1. Language & strictness

- **TypeScript strict mode** — always on. `strict: true` in `tsconfig`.
- No `any` without a documented boundary and a comment explaining why and where it ends.
- No `// @ts-ignore` or `// @ts-expect-error` to hide real errors. Suppress only when there is a
  genuine upstream typing gap, with a specific rationale and bounded scope.
- Prefer `unknown` + narrowing over `any`.

## 2. Validation

- **Zod** at every untrusted boundary (HTTP input, server actions, CSV, webhooks, provider
  responses, AI responses).
- Derive types from schemas: `type X = z.infer<typeof xSchema>`.
- Don't duplicate the shape in both a manual type and a Zod schema; schemas own the truth.

## 3. Structure & layering

- Follow `docs/folder-structure.md` and `docs/architecture.md` exactly.
- No business logic in React components or route handlers.
- No direct third-party calls from services; go through a provider interface.
- Repositories are the only place that touches Supabase; all queries workspace-scoped.

## 4. Naming

- Files/directories: `kebab-case` for directories; components PascalCase files.
- Components: `PascalCase`.
- Functions, variables: `camelCase`.
- Types/interfaces: `PascalCase`.
- Constants (env-derived): `SCREAMING_SNAKE_CASE`.
- Booleans prefixed `is`/`has`/`can`.

## 5. Functions & files

- Small, single-purpose functions. Descriptive names.
- Avoid oversized components/files; if a file grows, split by clear responsibility (not
  arbitrarily).
- One primary export per file where practical.

## 6. Comments

- Comments **only** where they explain non-obvious intent.
- Avoid restating code, redundant section banners, and AI noise.
- A Decision Log entry is preferred over a stale parenthetical for "why".

## 7. Errors & logging

- Throw typed errors; services map to safe HTTP responses; never leak secrets/stacks to clients.
- Logs: structured, no secrets, no unnecessary personal data. Include correlation ids.
- Provider/AI failures degrade gracefully: tagged fallback or a safe user error.

## 8. Imports

- Use Node's `next/` and `@/` path aliases consistently (configured in `tsconfig.json`).
- Group: external → `@/` absolute → relative. No unused imports (lint enforces).

## 9. Dependencies

- Stable, maintained packages. Avoid installing for trivially-implementable behavior.
- Pin/intentionally manage versions (npm). Run security audits.
- No Prisma alongside Supabase unless explicitly requested later.

## 10. Testing

- New code ships with tests. Vitest for unit/integration; Playwright for e2e critical flows.
- Don't weaken tests to make CI pass. See `docs/testing-guidelines.md`.

## 11. Formatting & quality gate

- Format on save with the project formatter (Prettier/ESLint per Phase 1 setup).
- The Definition of Done gate (`AGENTS.md` §10) must pass before claiming completion.

## 12. Anti-patterns (forbidden)

- Placeholder code presented as finished.
- Fabricated command/test results.
- Duplicated business logic across features.
- "Just for now" loose ends left in production code.
