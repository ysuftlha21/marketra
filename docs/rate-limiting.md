# Durable rate limiting

Marketra uses a provider-neutral `RateLimitProvider`. `mock` is deterministic for tests, `memory`
is process-local and development-only, and `redis` is the production provider. Feature code calls
the shared security service and never a Redis SDK or REST endpoint directly.

## Algorithm and atomicity

Redis uses a fixed window. One Lua `EVAL` atomically performs `INCR`, applies `PEXPIRE` only to a
new bucket, and returns the counter and server TTL. There is no read-then-write race. Results carry
`allowed`, `remaining`, `limit`, `resetAt`, `retryAfterSeconds`, and a safe operation ID. Redis TTL
is authoritative; `resetAt` is derived from that TTL for display and headers.

## Policies and scopes

`src/lib/security/rate-limit-policy.ts` is the typed registry for auth, Hunter, AI, application,
billing, and future mail operations. Auth uses a privacy-safe proxy IP scope plus a SHA-256 hash of
the normalized email where needed. Authenticated operations use trusted user and workspace IDs
resolved server-side; project IDs can further narrow a bucket. Namespace and environment are part
of every key. Raw emails, IPs, names, queries, tokens, and provider payloads are never keys or logs.

Entitlements and rate limits are separate. Paid operations authorize the user/workspace, check the
plan entitlement, consume the rate-limit bucket, call the provider, then record usage. A denied or
unavailable limiter prevents the provider call and consumes no provider entitlement. Once a
provider call starts, provider-specific usage rules govern partial failures.

## Failure behavior

Costly and abuse-sensitive operations fail closed. No production fallback to memory exists. The
low-risk Hunter readiness policy may fail open only when the global `RATE_LIMIT_FAIL_CLOSED` switch
is explicitly false. Denials and provider failures emit redacted structured events; ordinary
successes are not logged to avoid volume and sensitive behavioral telemetry.

HTTP routes can use `rateLimitHeaders()` for `Retry-After`, `RateLimit-Limit`,
`RateLimit-Remaining`, and `RateLimit-Reset`. Server actions receive the same typed result/error
metadata and expose only controlled messages.

## Production activation on Vercel

Set server-only values (never `NEXT_PUBLIC_`):

```env
DEFAULT_RATE_LIMIT_PROVIDER=redis
RATE_LIMIT_REDIS_URL=https://your-serverless-redis-rest-endpoint
RATE_LIMIT_REDIS_TOKEN=<secret>
RATE_LIMIT_NAMESPACE=marketra
RATE_LIMIT_FAIL_CLOSED=true
RATE_LIMIT_REQUEST_TIMEOUT_MS=3000
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=60
```

Use a Redis REST service that accepts Redis command arrays and supports `EVAL`. Configure all
production and preview instances consistently. The readiness endpoint performs a bounded `PING`
when Redis is selected and returns only ready/unavailable—never host or credential details.

Rollout: provision Redis, restrict the token, set preview variables, deploy, verify readiness and
denial telemetry, run concurrency smoke tests, then promote the same configuration to production.
Rollback by restoring the previous healthy Redis endpoint/token. Do not switch production to
memory. Mock is suitable only when paid/security-sensitive production operations remain disabled.

Local development defaults to mock. Memory can be selected to manually observe fixed-window
behavior in one process but does not model Vercel distribution. Tests use mock/memory or mocked
Redis REST responses and never require real credentials.

An opt-in disposable smoke test is available with `npm run test:smoke:redis-rate-limit`. It runs
only when `RATE_LIMIT_REDIS_SMOKE=true` and Redis credentials are present. It uses a random
`marketra:smoke:*` bucket, verifies atomic `EVAL` consumption and TTL/denial behavior, then removes
the bucket with `DEL`. It never prints the endpoint, token, or full key.
