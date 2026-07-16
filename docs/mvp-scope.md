# MVP Scope

> What the MVP must eventually include, and what is explicitly excluded. Read alongside
> `AGENTS.md` and `docs/product-overview.md`.

## 1. In scope (MVP must include)

1. **Authentication and workspace management** — signup, login, workspace creation, roles.
2. **SaaS project creation and editing** — a founder manages one or more SaaS products.
3. **Safe SaaS website analysis** — SSRF-guarded fetch + analysis of the product website.
4. **Structured product analysis** — structured AI-assisted product breakdown (validated).
5. **Target-country selection** — pick countries per project.
6. **Country-specific market analysis** — sourced facts + AI interpretation, sources attached.
7. **Country comparison** — compare multiple target markets side by side.
8. **Country-specific ICP generation and editing** — generated ICPs, editable by the founder.
9. **Manual company entry** — add companies by hand.
10. **CSV company import** — guarded against formula injection, type/size-limited.
11. **One replaceable external company-data provider** — behind `LeadProvider`, swappable.
12. **Company enrichment** — merge additional structured fields onto a company.
13. **Deterministic company matching** — explainable score, not a black-box AI score.
14. **Match explanations** — positive reasons, negative reasons, missing-data indicators.
15. **Decision-maker role recommendations** — _role_ recommendations, not unlawful contact scraping.
16. **Localized outreach generation** — English, local language, or both.
17. **Lead lists** — organize matched companies into lists.
18. **Lightweight CRM** — companies, activities, statuses, per workspace.
19. **Usage limits** — plan-based limits tracked per workspace.
20. **Country-specific pricing** — plan identity separated from country price.
21. **Subscription architecture** — billing provider abstraction, webhook-safe flows.
22. **Admin foundation** — minimal admin tooling for support/debugging.
23. **Audit and cost tracking** — audit important mutations; track AI token/cost.

## 2. Out of scope (explicitly excluded from MVP)

- **Automatic LinkedIn actions** — no LinkedIn messaging, connecting, scraping, or automation.
- **Automated bulk cold-email sending** — Outreach is generated, not auto-blasted.
- **Bypassing external-platform limits** — no rate-limit/rule circumvention.
- **A proprietary global company database** — Marketra uses providers + user data, not its own db.
- **Mobile applications** — responsive web only.
- **Custom machine-learning model training** — no model training; AI via provider APIs only.
- **Advanced enterprise CRM** — pipeline forecasting, complex deal stages, etc. are out.
- **Real-time collaborative editing** — no multi-cursor / live co-editing.
- **White-label agency portals** — no reseller/white-label surface.
- **Browser extensions** — none.
- **Dozens of provider integrations** — one external lead provider + mocks for MVP.
- **Full marketing automation** — no drip sequences, behavior triggers, or journey builders.

## 3. Scope principles

- Build the **smallest end-to-end path** that delivers real value, then deepen.
- Provider swaps must be cheap: every external dependency sits behind an interface.
- Anything data-critical must be **deterministic or sourced**, not purely AI-generated.
- Anything that risks legal/ethical exposure (personal data, platform automation) is deferred or
  permanently excluded.

## 4. MVP user journeys (priority order)

1. Founder signs up → creates workspace → adds a SaaS product.
2. Founder triggers safe product analysis.
3. Founder selects target countries → triggers market analysis.
4. Founder reviews/edits generated country ICPs.
5. Founder discovers companies (manual / CSV / external) → matches scored + explained.
6. Founder generates localized outreach → saves to CRM.
7. Founder tracks activity + which markets/ICPs/messages produce results.
8. Founder upgrades plan with country-specific pricing.
