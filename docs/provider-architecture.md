# Provider Architecture

> All external integrations are abstracted behind provider interfaces. Services depend on the
> interface, never on a concrete vendor. Read with `docs/architecture.md`.

## 1. Why providers

- Avoid vendor lock-in and vendor-specific leakage across the codebase.
- Make selection **env-driven** (e.g. `AI_PROVIDER=mock|openai`).
- Make testing deterministic via mocks and contract tests.
- De-couple business logic from third-party rate limits, payloads, and formats.

## 2. The six required interfaces

All under `src/lib/providers/<name>/`.

| Interface                    | Implementations                                                                                 | Foundation default |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ------------------ |
| `AiProvider`                 | `OpenAiProvider` (planned), `MockAiProvider`                                                    | `mock`             |
| `LeadProvider`               | `ManualLeadProvider`, `CsvLeadProvider`, `ExternalLeadProvider`, `MockLeadProvider`             | `mock`             |
| `MarketIntelligenceProvider` | mock + external slot                                                                            | `mock`             |
| `BillingProvider`            | `StripeBillingProvider`, `PayTRBillingProvider`, `IyzicoBillingProvider`, `MockBillingProvider` | `mock`             |
| `EmailProvider`              | mock + SMTP slot                                                                                | `mock`             |
| `AnalyticsProvider`          | mock + slot                                                                                     | `mock`             |

## 3. Shape of a provider

Each provider folder contains:

```
lib/providers/ai/
  ai.provider.ts        Interface + shared types (provider-agnostic)
  open-ai.provider.ts   OpenAiProvider (later)
  mock-ai.provider.ts   MockAiProvider (default in foundation)
  ai.factory.ts         env-driven factory: createAiProvider()
  prompts/              versioned prompts (AI only)
```

- The **interface** file declares methods and Zod-validated return types. No vendor types.
- The **factory** reads env and returns the configured implementation. Services receive the
  interface via the factory and never import a concrete class.
- The **mock** makes tests deterministic and lets features be built before the real vendor is
  wired in.

## 4. Selection

Env-driven, never hardcoded:

| Env                  | Options                                   |
| -------------------- | ----------------------------------------- |
| `AI_PROVIDER`        | `mock` \| `openai`                        |
| `LEAD_PROVIDER`      | `mock` \| `manual` \| `csv` \| `external` |
| `MARKET_PROVIDER`    | `mock` \| `external`                      |
| `BILLING_PROVIDER`   | `mock` \| `stripe` \| `paytr` \| `iyzico` |
| `EMAIL_PROVIDER`     | `mock` \| `smtp`                          |
| `ANALYTICS_PROVIDER` | `mock` \| `external`                      |

Selection happens once at request scope; the chosen provider is injected into services.

## 5. AiProvider contract (illustrative)

```ts
export interface AiProvider {
  analyzeProduct(input: ProductAnalysisInput): Promise<ProductAnalysisResult>;
  analyzeMarket(input: MarketAnalysisInput): Promise<MarketAnalysisResult>;
  generateIcp(input: IcpGenerationInput): Promise<IcpProfile>;
  explainMatch(input: MatchExplanationInput): Promise<MatchExplanation>;
  generateOutreach(input: OutreachInput): Promise<OutreachContent>;
  // ...
}
```

- Every return type is validated by a Zod schema defined beside the interface.
- The interface is **provider-agnostic**: no `model`, `temperature`, or vendor params here.
  Vendor-specific tuning lives inside the concrete provider only.
- Token usage + estimated cost are reported back; the service records them in `ai_runs`.

## 6. LeadProvider contract (illustrative)

```ts
export interface LeadProvider {
  searchCompanies(input: CompanySearchInput): Promise<CompanySearchPage>;
  enrichCompany(input: CompanyEnrichmentInput): Promise<CompanyRecord>;
}
```

- `manual` and `csv` are local-data providers (no network). `external` wraps one external
  company-data provider (swappable). Marketra does **not** maintain a proprietary global company
  database (out of scope, see `docs/mvp-scope.md`).

## 7. BillingProvider contract (illustrative)

```ts
export interface BillingProvider {
  createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession>;
  handleWebhook(rawBody: Uint8Array, headers: Record<string, string>): Promise<WebhookResult>;
  billingReferenceFor(plan: PlanId, countryCode: string): Promise<string | null>;
}
```

- Webhooks are verified per provider. Billing country + checkout validation override IP location.
- Plan identity is a stable id (`free|starter|growth|agency`); country price is separate data.

## 8. Contract tests

- Each interface has contract tests against the mock and (when added) the real implementation.
- Mocks must pass the same contract test suite as real providers, so swapping is safe.

## 9. Foundation scope

Only **interfaces + mocks + factories + types** ship in the foundation phase. No real vendor
integrations yet. No API keys required to run the app locally on mocks.
