# Product Overview

> Permanent product definition for Marketra. Read alongside `AGENTS.md`.

## 1. One-liner

Marketra is an AI-powered market-entry, customer-discovery and go-to-market (GTM) platform for
SaaS founders.

## 2. Who it is for

| Segment                          | Description                                           |
| -------------------------------- | ----------------------------------------------------- |
| Solo SaaS founders               | One person building and selling a SaaS product        |
| Indie hackers                    | Developers shipping small commercial software         |
| Micro-SaaS founders              | Tiny-revenue, low-headcount SaaS businesses           |
| Small B2B SaaS teams             | 2–10 person teams who need GTM leverage               |
| Software agencies launching SaaS | Agencies productizing services into SaaS              |
| No-code SaaS founders            | Non-engineer founders shipping SaaS on no-code stacks |

## 3. Problem

Founders can build, but they struggle to answer: _"Which companies in which countries should I
sell to, and how do I reach them?"_ Existing tools are either too generic (one-size-fits-all
ICPs), too manual (research, spreadsheets, cold lists), or too aggressive (mass automation,
platform-rule-breaking scraping). Marketra sits in the middle: **helped, explainable,
country-aware, privacy-respecting**.

## 4. Core product flow

```
Add SaaS product
  → Analyze the product (website + structured analysis)
  → Choose target countries
  → Analyze each target market
  → Generate country-specific ICPs
  → Discover matching companies
  → Score and explain each match
  → Recommend decision-maker roles
  → Generate localized outreach (English / local language / both)
  → Manage companies & outreach in a lightweight CRM
  → Measure which markets, ICPs and messages produce results
```

## 5. Key concepts

- **Project** — a SaaS product a founder is bringing to market. The top-level work unit.
- **Target market** — a country the founder wants to sell into, attached to a project.
- **ICP (Ideal Customer Profile)** — generated per country, editable, defines matching criteria.
- **Company** — a real, sourced company entry (manual, CSV, or external provider). Never invented.
- **Match** — a deterministic, explainable score of how well a company fits an ICP.
- **Decision-maker recommendation** — suggested role(s) to contact for a company, never personal
  data scraped from unlawful sources.
- **Outreach** — generated message content (subject + body) in one or two languages.
- **Campaign** — optional grouping of outreach for tracking.
- **CRM** — companies + activities + statuses tracked per workspace.
- **Workspace** — tenant boundary. Every tenant-owned record is scoped by `workspace_id`.

## 6. AI assistance vs. AI authority

Marketra uses AI for **assistance and interpretation**, never as the authoritative source of
facts about the world.

- AI **may**: summarize, interpret, translate, draft outreach, explain matches in natural language.
- AI **must not**: invent companies, invent contacts, invent market figures, fabricate citations,
  or silently determine the full match score.

Sourced facts are kept separate from AI interpretation. Estimates are clearly tagged. See
`docs/ai-rules.md`.

## 7. Localization

- The **application UI is English-only** for the foreseeable future.
- **Outreach content** may be generated in the target market's local language.
- **Pricing** is country/region-specific with the correct currency; never hardcoded in components.

## 8. Pricing

Plans are identified by stable IDs — `free`, `starter`, `growth`, `agency`. Plan _identity_ is
separate from country _price_. A country price record carries country code, optional region
fallback, currency, monthly amount, annual amount, billing-provider price reference, activation
status, and effective dates. Billing country + checkout validation are authoritative — not IP
location. See `AGENTS.md` §8.

## 9. Providers

External integrations are abstracted behind six provider interfaces selected by config/env:

1. `AiProvider` (OpenAI planned, Mock default)
2. `LeadProvider` (Manual / CSV / External / Mock)
3. `MarketIntelligenceProvider`
4. `BillingProvider` (Stripe / PayTR / Iyzico / Mock)
5. `EmailProvider`
6. `AnalyticsProvider`

See `docs/provider-architecture.md`.

## 10. Non-goals (do not build)

See `docs/mvp-scope.md` §"Out of scope" for the full list. Highlights: no automated bulk cold
email, no LinkedIn automation, no scraping of private personal data, no proprietary global company
database, no mobile apps.
