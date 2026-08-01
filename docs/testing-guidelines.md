# Testing Guidelines

> Test strategy for Marketra. Conflicts resolve to `AGENTS.md`.

## 1. Pyramid

- **Unit** (Vitest): domain logic, services with mocked repos/providers, pure helpers.
- **Integration** (Vestest + Supabase local / in-memory): repositories, services that touch DB.
- **End-to-end** (Playwright): critical user flows through the real Next.js app.
- **Contract tests**: each provider interface has contract tests run against mock and (when added)
  real implementations, so swaps are safe.
- **Validation tests**: Zod schemas reject malformed input and accept valid input.
- **Authorization/tenant-isolation tests**: explicit RLS + service-level asserts that cross-workspace
  access is impossible.
- **Matching-engine tests**: deterministic score + reasons assertions, independent of AI.

## 2. Tools

| Purpose            | Tool                                     |
| ------------------ | ---------------------------------------- |
| Unit + integration | Vitest                                   |
| E2E                | Playwright                               |
| Assertions/helpers | included test utils under `tests/utils/` |
| Coverage           | Vitest coverage                          |

## 3. Co-location

- Unit tests sit next to the module they test: `matching-engine.ts` ↔ `matching-engine.test.ts`.
- Integration/e2e that spans folders lives under `tests/`.
- Shared fixtures under `tests/utils/` — no copy-pasted fixture sprawl.

## 4. What must be tested

- Matching engine: deterministic, explainable, fully unit-tested (the score is code, not AI).
- Provider mocks: satisfy the interface contract tests.
- Zod schemas: negative cases for every "must reject" rule (size/type/injection).
- SSRF guard: blocked IP ranges, redirect chains, non-http schemes.
- CSV guard: formula-injection edge cases (`=`, `+`, `-`, `@`, tab/CRLF), oversize files.
- Authorization: a user from workspace A cannot read/write workspace B (service + RLS tests).
- Audit: important mutations write to the audit log.
- Usage limits: counters enforce caps.

## 5. Determinism

- AI providers are mocked in tests; real calls are never made from unit/integration tests.
- Use deterministic clocks/seeds where time-dependent.
- No flaky sleeps; use fake timers or explicit await of state.

## 6. Quality gate

Before claiming a feature complete, run:

```pwsh
npm run lint; if ($?) { npm run typecheck }
npm run test:unit
npm run test:integration      # when relevant
npm run build
npm run test:e2e -- <suite>   # when the feature is testable end to end
```

- Never delete, skip, or weaken a failing test to pass. Fix the cause.
- A skipped test must include a tracking TODO and an issue reference (when tracked).

## 7. Coverage expectations

- Domain logic + matching engine: high coverage targets (~90%+).
- Services: behavior-focused, mocks for repos/providers.
- Repositories: integration tests where local Supabase is available.
- Components: lightweight behavior tests for the six states; avoid snapshot sprawl.

## 7.1 Supabase integration runtime

- `npm run test:unit` excludes `tests/integration`; pure unit files may run in parallel.
- `npm run test:integration` uses `vitest.integration.config.ts` with one worker and serial file
  execution. This bounds concurrent Auth and database traffic against the shared test project.
- Individual Supabase HTTP requests abort after 15 seconds. Integration tests use a 20-second test
  timeout and 30-second hook/teardown timeouts so multi-request fixture setup and cleanup remain
  bounded without weakening assertions.
- Set `INTEGRATION_TIMING_DIAGNOSTICS=true` only while diagnosing infrastructure latency. Timing
  records contain allowlisted operation categories and durations only; URLs, identities, payloads,
  credentials, and provider responses are never logged.
- Fixtures must delete workspace-owned rows before deleting temporary Auth users. Cleanup remains
  best-effort only after the test assertions have completed and must never mask an assertion failure.

## 8. E2E suites

Outreach E2E fixtures use isolated workspaces and the approved test-Supabase guard. The Mock provider
is synchronous and the authoritative suite uses the repository's single-worker configuration. Draft
workflow coverage includes optimistic concurrency, immutable history, role-denied review actions,
URL-preserved dashboard filters, browser health, and mobile reachability.

Critical MVP flows covered by Playwright suites (named, selectable via `-- <suite>`):

- `auth` — signup/login/workspace.
- `project` — add/edit SaaS product.
- `market` — select countries → market analysis.
- `icp` — generate/edit ICP.
- `discovery` — manual/CSV company entry + matching.
- `outreach` — generate localized outreach → CRM.
- `billing` — country-specific pricing → checkout (mock provider).

# Phase 9 verification

Provider tests cover unknown IDs, missing credentials, malformed structured output, and safe errors
without real secrets. Mock browser tests remain authoritative. Live provider smoke tests are
separate and opt-in. Subscription, manual-company, and AI-usage RLS tests require migrations
0033–0034 in the approved test database.

# Phase 10 verification

Closed-beta policy, URL safety, security headers, health readiness, SMTP validation, durable
rate-limit behavior, billing-event ordering, provenance, and legal configuration have deterministic
tests. Real OpenAI and SMTP checks are intentionally excluded from CI and run only through
`npm run test:smoke:openai` or `npm run test:smoke:smtp` with operator-provided credentials. Those
credential-gated smoke cases are the only intentional static skips in the ordinary Vitest run.
