# Phase 10 Closed-Beta Launch Readiness

Status meanings: **complete** is implemented and locally verified; **operator action** needs an
external account, production setting, DNS/legal authority, or credential; **optional after beta**
is intentionally non-blocking.

| Item                                        | Status              | Required action                                                                              |
| ------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| Production URL and Vercel deployment        | complete            | Re-check after the final controlled deploy.                                                  |
| Supabase health and migrations through 0034 | complete            | Confirm backup and dry-run before future migrations.                                         |
| Closed-beta signup enforcement              | complete            | Set `SIGNUP_MODE=invite_only` and private `SIGNUP_ALLOWLIST`.                                |
| OpenAI provider boundary                    | complete            | **Operator action:** supply a valid key and run `npm run test:smoke:openai`.                 |
| Marketra SMTP provider                      | complete            | **Operator action:** configure SMTP and `SMTP_SMOKE_TO`, then run `npm run test:smoke:smtp`. |
| Supabase Auth SMTP                          | operator action     | Configure sender, host, port, username, credential, Site URL, and redirects.                 |
| Durable production rate limiting            | operator action     | Configure the external provider endpoint and token.                                          |
| Billing                                     | operator action     | Select a vendor; implement verified signatures before activation.                            |
| Company discovery                           | complete            | Manual is guaranteed; Mock is labeled demo. Real vendor selection remains open.              |
| Analytics/error monitoring                  | optional after beta | No vendor selected; structured redacted logs are active.                                     |
| Legal pages                                 | complete            | **Legal review:** replace operator placeholders and review all text.                         |
| Support and deletion contact                | operator action     | Set a monitored `SUPPORT_EMAIL`.                                                             |
| Backups and restore drill                   | operator action     | Confirm retention and perform a restore drill.                                               |
| Mobile/accessibility smoke                  | complete            | Repeat on the final production build.                                                        |
| Auth redirects and confirmation             | operator action     | Verify callbacks, expiry, recovery, and throttling.                                          |

## Safe closed-beta environment

```text
APP_ENV=production
SIGNUP_MODE=invite_only
SIGNUP_ALLOWLIST=<private comma-separated exact emails or @domains>
DEFAULT_AI_PROVIDER=mock
DEFAULT_OUTREACH_PROVIDER=mock
DEFAULT_LEAD_PROVIDER=manual
DEFAULT_COMPANY_DISCOVERY_PROVIDER=mock
DEFAULT_BILLING_PROVIDER=mock
DEFAULT_EMAIL_PROVIDER=mock
DEFAULT_ANALYTICS_PROVIDER=mock
DEFAULT_RATE_LIMIT_PROVIDER=redis
```

The Redis limiter accepts canonical `RATE_LIMIT_REDIS_URL` and `RATE_LIMIT_REDIS_TOKEN`, or the
Vercel Marketplace-managed write REST names `RATE_LIMIT_REDIS_KV_REST_API_URL` and
`RATE_LIMIT_REDIS_KV_REST_API_TOKEN`. Canonical names take precedence. Read-only tokens and
`RATE_LIMIT_REDIS_KV_URL` are intentionally unsupported. Mock/memory rate limiting is not suitable
for multi-instance production.

For a one-time Preview runtime verification of Sensitive Marketplace credentials, set Preview-only
`RATE_LIMIT_REDIS_SMOKE=true` and a separate high-entropy `RATE_LIMIT_REDIS_SMOKE_TOKEN`, redeploy,
and run `npm run smoke:redis-rate-limit:preview` with `MARKETRA_PREVIEW_URL` and the same smoke token
set only in the operator environment. Disable/remove both smoke variables and redeploy immediately
after verification. The endpoint is unavailable outside Vercel Preview.

## Provider and Auth smoke tests

```pwsh
npm run test:smoke:openai
npm run test:smoke:smtp
```

These are opt-in, bounded, and never print credentials or raw provider output. SMTP sends one
message only to operator-controlled `SMTP_SMOKE_TO`. For Supabase Auth, configure sender identity,
SMTP host/port/user/credential, Site URL, and exact redirect allowlist. Test confirmation, resend
throttling, recovery, expired/reused links, and reset sign-in. Inspect Auth and delivery logs without
copying tokens into tickets.

## Retention, deletion, diagnostics, and rollback

- Project archive is reversible; destructive actions require authorization and confirmation.
- Company/Outreach data remain workspace-scoped. AI usage contains metadata, not prompts/bodies.
- Account/workspace deletion is operator-assisted: verify identity, ownership, scope, holds, and
  explicit confirmation. Retention durations require operator/legal approval.
- Use Vercel structured `marketra.operation` logs and Supabase Auth/database logs, correlated by
  operation ID. Never log secrets.
- Roll back application deployment first; disable signup; keep migrations unless a separate data
  rollback is reviewed. Mock fallback must remain visibly labeled.

Long-running real AI/discovery operations require a durable queue/worker before exceeding Vercel
request limits. Phase 10 does not add an in-process fake queue or detached background work.
