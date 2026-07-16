# AI Rules

> How AI is used in Marketra. AI assists; it does not own facts or compute the final match score.
> Read with `docs/architecture.md` and `docs/provider-architecture.md`.

## 1. Provider containment

- All AI code lives inside `OpenAiProvider` (and future concrete `AiProvider`s) under
  `lib/providers/ai/`.
- Services call the `AiProvider` interface. They **never** import an AI SDK, reference a model
  name, or pass vendor params.
- Model selection is env-driven: `OPENAI_MODEL=gpt-4o-mini` (planned default).
- The factory returns the configured provider (mock by default in foundation).

## 2. Structured, validated output

- AI is asked for **structured JSON** wherever possible.
- Every AI response is parsed against a Zod schema defined beside the interface or by the calling
  service. Responses failing validation are rejected or safely handled (record fallback, retry
  with backoff, then surface a safe error).
- No `any` shapes returned to services. The boundary type is Zod-inferred.

## 3. Versioned prompts

- Prompts live under `lib/providers/ai/prompts/` and are versioned (`v1`, `v2`, …).
- The version used is recorded with every AI run (for audit + reproducibility).
- Prompts never embed secrets or personal customer data beyond what the operation requires.

## 4. Reliability

- Per-call **timeouts** (e.g. `OPENAI_TIMEOUT_MS`).
- Limited **retries with exponential backoff** (e.g. `OPENAI_MAX_RETRIES`). Never retry
  indefinitely; never retry on non-retryable errors.
- Failures degrade gracefully: return a safe, tagged result or a clearly-marked error.

## 5. Token usage & cost tracking

- Each AI run records: provider, model, prompt version, token counts (prompt/completion/total),
  estimated cost, status, and correlation id — in `ai_runs` (no secret payloads).
- Feature limits cross-reference this table for usage controls. See `docs/database-rules.md`.

## 6. AI must not invent facts

AI may **never** invent:

- companies,
- contacts / personal data,
- market figures / statistics,
- citations / sources.

If the AI cannot find reasonable input, it returns a clearly-tagged empty/low-confidence result.
Sourced facts come from real providers/saved data, not the model's memory.

## 7. Sourced facts vs. AI interpretation

- Market analysis separates **sourced facts** (with `sources JSONB`: URL, retrieved_at, snippet)
  from **AI interpretation** (tagged `is_ai_generated`).
- Estimates are tagged `is_estimate=true` with `confidence`.
- The UI clearly distinguishes "sourced" from "AI-generated" content.

## 8. Matching engine — deterministic & explainable

The numeric match score is computed by the **deterministic matching engine** in
`features/matching/domain`, **not** by AI.

Criteria (illustrative, weights configurable):

- country fit,
- industry fit,
- employee-range fit,
- company-type fit,
- pain-point fit,
- technology fit,
- buying signals,
- hiring signals,
- decision-maker availability.

Every score produces:

- **positive reasons** — why it matched,
- **negative reasons** — why it lost points,
- **missing-data indicators** — what we couldn't evaluate.

AI **may** help produce a readable explanation of the deterministic score, but the score itself is
never secretly determined by the model.

## 9. No browser secrets

- `OPENAI_API_KEY` and any provider keys are **server-only**. Never prefixed `NEXT_PUBLIC_`.
- Errors returned to the client never include raw provider responses, key fragments, or stack
  traces that reveal internal prompts.

## 10. Privacy & safety

- Don't send unnecessary personal data to AI providers.
- Don't log raw personal data in `ai_runs`.
- Outreach generation works from public company/role context — never from unlawfully scraped
  personal contact data.

## 11. Testing

- Mock AI provider returns deterministic, Zod-valid results.
- Real provider (when added) runs behind the same interface contract tests.
- The matching engine has exhaustive unit tests independent of any AI provider.
