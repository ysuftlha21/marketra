# Hunter provider foundation

## Scope and activation

Hunter is an optional, server-only data provider. Company, buyer, and email-enrichment defaults remain `mock`; adding credentials does not activate Hunter. Production activation is operator-controlled after plan, entitlement, rate-limit, privacy, and credit monitoring review. This foundation sends no cold email and the smoke test writes no Marketra data.

## Configuration

- `HUNTER_API_KEY` is required only when a Hunter provider or `HUNTER_SMOKE=true` is selected.
- `HUNTER_BASE_URL` defaults to `https://api.hunter.io/v2`.
- `HUNTER_TIMEOUT_MS` defaults to 15000 and `HUNTER_MAX_RETRIES` to 2.
- The three `DEFAULT_*_PROVIDER` selectors activate company, buyer, and email enrichment independently.

Never expose credentials through `NEXT_PUBLIC_*`, UI responses, logs, screenshots, fixtures, or commits.

## Operations and data flow

Adapters cover Discover, Domain Search, Email Finder, Email Verification, Company Enrichment, Email/Person Enrichment, and Combined Enrichment. Discovery normalizes into Marketra's company candidate contract and still uses deterministic fit scoring. Hunter contacts remain distinct from AI decision-role recommendations and the outbound email provider.

Company and verification results use bounded in-process TTL caches to avoid duplicate calls. A multi-instance production rollout should use a shared encrypted cache if cross-instance consistency is required. Provider errors become safe categories; raw bodies are not logged or returned.

The HTTP client exposes a provider-neutral `onUsage` callback with operation, operation ID, attempt count, duration, and HTTP status. Production wiring can persist this metadata for plan and credit reporting without storing request bodies or personal data.

## Security and privacy

- Provider calls are server-only. Discovery retains existing workspace/project ownership checks and fail-closed rate limiting.
- Buyer discovery, enrichment, and verification are registered as fail-closed operations and must be wired through an authorized service before any UI activation.
- Person/email calls must be explicit user actions for selected records and pass plan entitlements before activation.
- Persist only workflow-required fields with provenance and fetch time. Honor retention/deletion rules. Never use the integration for unlawful scraping, automated LinkedIn actions, account enumeration, or unsolicited bulk email.

## Smoke test and credits

Run `npm run test:smoke:hunter` only with an operator-approved `.env.local`. It makes one read-only Discover request and no database write. Hunter documents Discover as free, but pricing can change; confirm the current account plan. Domain Search, Finder, Verification, and enrichment can consume credits and are excluded from the default smoke test.

The test logs only sanitized operation metadata and never prints keys, response bodies, emails, or contacts.

## Rollback

Set all Hunter selectors back to `mock` and redeploy. No database migration is introduced. Existing company records keep their provenance and remain readable.
