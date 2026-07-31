# Security Rules

> Non-negotiable security posture. Read with `docs/architecture.md` and `docs/database-rules.md`.

## 1. Authentication & authorization

- Auth via **Supabase Auth**. Verify sessions **server-side**; never trust client claims.
- Authorization (workspace membership + role) enforced server-side in `lib/auth/` **and** via
  RLS. Defense in depth.
- Roles: `owner`, `admin`, `member`. Extensible design, kept simple now.
- A client-supplied `workspace_id` is **never trusted**. Repositories override/validate it from
  the resolved session.

## 2. Multi-tenancy isolation

- `workspace_id` on every tenant-owned row. RLS enabled on every tenant-owned table.
- The browser/anon key is RLS-bound. The service role key is server-only and never bundled.
- Cross-tenant reads/writes are prevented by RLS even if application code has a bug.

## 3. Input validation

- **Zod-validated** every untrusted boundary: route handler input, server action args, CSV rows,
  webhook payloads, provider responses.
- Reject early. Never pass unvalidated data to a service, repository, or AI call.
- No `any` to bypass. No `ts-ignore` to silence schema errors.

## 4. SSRF protection (website analysis)

When fetching a SaaS product website:

- Block **localhost**, loopback, private networks (RFC1918), link-local, carrier-grade NAT,
  the cloud-metadata endpoints (`169.254.169.254`, `fd00:ec2::254`), and other SSRF targets.
- Block **non-http(s)** schemes.
- Resolve DNS and check the resolved IP before connecting.
- Reject unsafe redirect chains; cap redirect count; re-validate each hop.
- Cap response size and overall fetch timeout.
- No default credentials in fetch.

## 5. File & CSV handling

- Uploads: allow only an explicit type + extension allowlist; cap size; detect content sniffing.
- Downloads from external URLs share the SSRF guard.
- **CSV formula-injection guard**: reject / sanitize cells beginning with `=`, `+`, `-`, `@`,
  `\t`, `\r`. Cap CSV row + column counts.
- Scan for zip-bomb / oversized decompression patterns where relevant.

## 6. Secrets management

- Secrets live in env / Vercel project settings — never in client bundles (`NEXT_PUBLIC_`), logs,
  error messages, or committed files.
- `.env` is gitignored; `.env.example` documents vars without values.
- No raw provider API responses are surfaced to the client.
- Error responses are safe, generic, and correlated by an id — not a stack trace.

## 7. Rate limiting & abuse

- Rate-limit **extension points** on expensive actions (website fetch, market analysis, AI calls,
  external lead search, billing checkout, email send).
- Foundation ships the _points_ + an in-memory mock limiter; production uses a durable backend
  decided later.
- Protect against runaway AI spend via per-workspace daily caps and usage counters.

## 8. Audit & retention

- Audit log important mutations (workspace changes, billing changes, deletes, outreach sends,
  external provider calls) in `audit_log`.
- Document **retention** and **deletion** considerations per data category. Provide a deletion path
  for workspace-scoped data.
- Avoid storing unnecessary personal data. Minimize PII.

## 9. Personal data & sourcing rules

- **Never scrape or store personal contact information from prohibited or unlawful sources.**
- **Never implement automatic LinkedIn actions** (messaging, connecting, scraping).
- **Never bypass external-platform rate limits, ToS, or auth.**
- Decision-maker _recommendations_ are **role-based**, not a database of scraped personal contacts.

## 10. Email & outreach safety

- Outreach is **generated, not auto-blasted**. No automated bulk cold-email sending in MVP.
- The EmailProvider (mock in foundation) is a send primitive; campaign blast behavior is out of
  scope and not built.

## 11. CSRF / prompts

- Server actions / route handlers use Next.js protections. Webhooks verify signatures per
  provider.

## 12. Security testing

- Authorization + tenant-isolation tests are first-class (see `docs/testing-guidelines.md`).
- Contract tests against provider mocks. Fuzz the matching/engine where cheap.

# Hunter provider boundary

Hunter is server-only and inactive by default. Company discovery retains the existing workspace/project authorization and fail-closed rate limit. Buyer and email enrichment must call the shared Hunter operation policy with a workspace-aware ownership/entitlement callback before provider access. Provider bodies, credentials, emails, and contact metadata must not be logged.
