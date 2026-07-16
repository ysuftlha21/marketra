# Development Workflow

> Task workflow for every change. Conflicts resolve to `AGENTS.md` §11.

## 1. Inspect → plan → act

- Read the relevant `docs/` and `AGENTS.md` first (loaded automatically via `opencode.json`).
- Understand the affected feature, layer, and provider before writing code.
- Produce a short plan when the task is non-trivial. Don't wait for confirmation unless genuinely
  blocked by an ambiguity.

## 2. Layering discipline

- Pick the right layer per `docs/folder-structure.md` and `docs/architecture.md`.
- UI components stay presentational; route handlers/pages stay thin; services orchestrate;
  domain stays pure; repositories are the only SQL-touching layer; providers are the only
  third-party-touching layer.

## 3. New work

1. Add/extend **Zod schema + types** first (`features/<f>/schema/`).
2. Add/extend **domain logic** if pure (`features/<f>/domain/`).
3. Add/extend **provider interface/mock** if an external boundary is involved.
4. Add/extend **repository** if data access is needed (workspace-scoped, RLS).
5. Add/extend **service** orchestration (`features/<f>/services/`).
6. Wire **route handler / server action** thin wrapper.
7. Build **components** with all six states (loading/empty/error/success/disabled/permission-denied).
8. Add **tests** (unit → integration → e2e as relevant).

## 4. Definition of done

Run before claiming completion (see `AGENTS.md` §10):

```pwsh
npm run lint; if ($?) { npm run typecheck }
npm run test:unit
npm run test:integration      # when relevant
npm run build
npm run test:e2e -- <suite>   # when the feature is testable end to end
```

- Never fabricate a success result. Actually run the command and report real output.
- Never weaken a failing test. Fix the cause.

## 5. Git hygiene

- **Never commit unless explicitly asked.**
- **Never push or open PRs unless explicitly asked.**
- When asked to commit: inspect `git status`, `git diff`, recent `git log`; stage only intended
  files; never commit secrets; commit message matches repo style and the change.

## 6. Deviation & decisions

- Any deviation from `AGENTS.md` or `docs/` requires an entry in `docs/decision-log.md` with
  rationale and date.
- Update the affected `docs/` file and the Decision Log together when a rule changes.

## 7. Reviews & quality bar

- TypeScript strict stays on. No `any` without a documented boundary. No `ts-ignore` shortcuts.
- No oversized files/components. Descriptive names. Comments only for non-obvious intent.
- No placeholder code presented as finished. No fabricated results.

## 8. Environment

- Local dev should run on **mocks** by default (`AI_PROVIDER=mock`, etc.) so no external keys are
  required to start. See `.env.example`.
- Real providers are opt-in via env, added behind their interface.

## 9. Reporting

When a task completes, report:

- files created/changed,
- decisions recorded (Decision Log entries),
- validations performed,
- commands run (with actual results),
- warnings or unresolved items,
- recommended next task.
