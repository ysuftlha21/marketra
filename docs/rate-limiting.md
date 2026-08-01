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

Vercel Marketplace-managed Upstash/KV installations can expose write-capable REST credentials
under managed names that cannot be copied or aliased. The server environment layer normalizes them
with this precedence:

1. URL: `RATE_LIMIT_REDIS_URL`, then `RATE_LIMIT_REDIS_KV_REST_API_URL`.
2. Token: `RATE_LIMIT_REDIS_TOKEN`, then `RATE_LIMIT_REDIS_KV_REST_API_TOKEN`.

`RATE_LIMIT_REDIS_KV_REST_API_READ_ONLY_TOKEN` is never accepted because atomic consumption and
smoke cleanup require writes. `RATE_LIMIT_REDIS_KV_URL` is a non-REST connection value and is also
never accepted. Features and providers receive only normalized `url` and `token` configuration;
they do not read Vercel-specific variables. Managed values do not need to be revealed, recreated,
copied, or manually aliased. After attaching the integration to another Vercel environment, that
environment must be redeployed so the new managed variables reach the server runtime.

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

## Preview runtime smoke endpoint

Sensitive Vercel Marketplace credentials cannot be exported to a local CLI. The fixed-command
`POST /api/internal/redis-rate-limit-smoke` endpoint therefore runs the same smoke service inside
the Preview runtime. It returns 404 unless both `VERCEL_ENV=preview` and
`RATE_LIMIT_REDIS_SMOKE=true` are present. A separate high-entropy
`RATE_LIMIT_REDIS_SMOKE_TOKEN` must be supplied in an `Authorization: Bearer` header and is compared
using fixed-length SHA-256 digests with `timingSafeEqual`. Query-string tokens are never accepted.

The endpoint has no command/key input, uses a unique `marketra:smoke:preview:*` key, permits only
one active run per authorization subject, allows two executions per five minutes per instance, and
bounds each Redis request to one second. It returns only assertion booleans and a random operation
ID with `Cache-Control: no-store`. The disposable key is deleted in `finally` after success or
failure. Production and Development receive 404.

Preview activation procedure:

1. Set Preview-only `RATE_LIMIT_REDIS_SMOKE=true`.
2. Set Preview-only `RATE_LIMIT_REDIS_SMOKE_TOKEN` to a new random high-entropy secret of at least
   32 characters. Do not reuse a Redis or application credential.
3. Keep `DEFAULT_RATE_LIMIT_PROVIDER=redis` and the Marketplace-managed write REST variables
   attached to Preview.
4. Redeploy the Preview deployment.
5. In the operator shell, set `MARKETRA_PREVIEW_URL` and `RATE_LIMIT_REDIS_SMOKE_TOKEN`, then run:

   ```powershell
   npm run smoke:redis-rate-limit:preview
   ```

6. After a successful result, set `RATE_LIMIT_REDIS_SMOKE=false` or remove both smoke variables,
   then redeploy Preview again. The Redis Marketplace credentials remain unchanged.

The operator script sends POST only, prints only the safe response fields, never prints the Bearer
token, and exits non-zero if any assertion or the HTTP request fails.
