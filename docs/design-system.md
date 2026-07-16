# Design System

> An original premium B2B SaaS look. Modern, minimal, data-focused, spacious, responsive,
> accessible, polished in **light + dark**. Conflicts resolve to `AGENTS.md` §7.

## 1. Principles

- **Data-first** interfaces: tables, lists, cards, score breakdowns, and structured explanations.
- **Spacious** but dense where data demands it.
- **Minimal**: few colors, restrained tokens, no decorative noise.
- **Original**: do not copy another product's look. Avoid generic "AI landing page" aesthetics.
- **Light + dark parity**: every component is designed and tested in both modes.
- **Accessible**: contrast, focus, keyboard nav, ARIA semantics, reduced-motion support.

## 2. Avoid

- Excessive gradients, heavy glassmorphism, random bright colors, giant rounded cards everywhere.
- Gratuitous animation. Inconsistent spacing. Low-contrast text. Bloat.

## 3. Design tokens

A small, restrained token set (CSS variables / Tailwind theme). Tokens, not magic numbers.

### Color

- A neutral base scale (gray/slate) for surfaces and text across light + dark.
- A single primary brand accent (and its disabled/muted variants).
- Semantic tokens: `success`, `warning`, `danger`, `info` — used sparingly and themable.
- Chart palette: deterministic, accessible, distinct enough for colorblindness (e.g. 4–8 hues).
- All colors defined as tokens so dark mode flips cleanly.

### Typography

- A limited type scale (display, heading, body, small, caption/mono).
- One sans for UI, one optional mono for data/metrics. No display flourishes.
- Consistent line-heights and weights per token.

### Spacing

- A 4px (or 8px) base scale; spacing composes from tokens, never ad hoc.
- Consistent section/padding tokens (page, card, gap).

### Radius

- A small radius scale (sm, md, lg). Avoid "giant rounded cards everywhere." Inputs/buttons
  share one radius token.

### Borders

- Thin, low-contrast borders in light mode; slightly brighter in dark mode. Use borders over
  shadows for separation by default.

### Shadows

- A small elevation scale. Restraint: most surfaces use borders, not shadows.

### Motion

- Small durations (120–200ms) for hover/focus, 200–300ms for view transitions.
- Respect `prefers-reduced-motion`. No layout-shifting animations on data views.

## 4. Component state contract (mandatory)

Every screen and reusable **data** component handles:

| State               | Requirement                                         |
| ------------------- | --------------------------------------------------- |
| `loading`           | skeletons / spinners; never blank jump              |
| `empty`             | empty-state with headline + guidance + optional CTA |
| `error`             | recoverable error UI with retry; never raw stack    |
| `success`           | confirmation/toast/inline success                   |
| `disabled`          | visually + a11y-disabled                            |
| `permission-denied` | explicit denied state where role matters            |

No data view ships without all six states (where relevant).

## 5. Layout

- **Desktop-first** for the dashboard. Productivity layout: app shell, sidebar nav, content area.
- **Tablet + mobile must work**: collapsible nav, responsive grids, readable tap targets.
- Containers and gutters from spacing tokens. No magic pixel widths.

## 6. Data presentation

- Tables: dense, sortable, with sticky headers where useful; cell alignment rules per type.
- Match scores: deterministic numeric badge + expandable explanation (positives/negatives/missing).
- Sources vs. AI text visually distinguished (e.g. chip tag "sourced" vs "AI-generated").
- Charts rely on the chart palette token, with accessible labels and labels-not-color rules.

## 7. Internationalization note

- UI strings are English-only for now. Outreach can be in the target market's local language;
  that is content, not UI copy.
- Build string keys in a single place so future i18n is feasible without rewrites.

## 8. Current Marketra Design Tokens

### Brand Colors

| Token          | Light                | Dark                 | Usage                                                     |
| -------------- | -------------------- | -------------------- | --------------------------------------------------------- |
| `--primary`    | `hsl(185, 70%, 32%)` | `hsl(185, 60%, 48%)` | Primary brand: buttons, links, active states, focus rings |
| `--accent`     | `hsl(34, 80%, 48%)`  | `hsl(34, 80%, 52%)`  | Accent: highlights, recommendations, commercial emphasis  |
| `--background` | `hsl(210, 30%, 98%)` | `hsl(222, 25%, 8%)`  | Page background                                           |
| `--surface`    | `hsl(0, 0%, 100%)`   | `hsl(222, 20%, 12%)` | Card / elevated surface background                        |
| `--foreground` | `hsl(222, 30%, 14%)` | `hsl(210, 20%, 94%)` | Primary text                                              |

### Neutral System

| Token                | Light                | Dark                 |
| -------------------- | -------------------- | -------------------- |
| `--muted`            | `hsl(210, 20%, 94%)` | `hsl(222, 18%, 16%)` |
| `--muted-foreground` | `hsl(215, 15%, 46%)` | `hsl(210, 12%, 60%)` |
| `--border`           | `hsl(210, 15%, 88%)` | `hsl(222, 16%, 22%)` |
| `--input`            | `hsl(210, 15%, 88%)` | `hsl(222, 16%, 24%)` |
| `--ring`             | `hsl(185, 70%, 32%)` | `hsl(185, 60%, 48%)` |

### Semantic Colors

| Token       | Light                | Dark                 |
| ----------- | -------------------- | -------------------- |
| `--success` | `hsl(152, 55%, 38%)` | `hsl(152, 55%, 48%)` |
| `--warning` | `hsl(38, 92%, 50%)`  | `hsl(38, 92%, 55%)`  |
| `--danger`  | `hsl(0, 65%, 48%)`   | `hsl(0, 65%, 55%)`   |
| `--info`    | `hsl(200, 65%, 48%)` | `hsl(200, 65%, 52%)` |

### Typography

| Role                        | Font                           | Weight  | Size    |
| --------------------------- | ------------------------------ | ------- | ------- |
| Display/Heading (marketing) | Newsreader (`font-display`)    | 400-600 | 24-56px |
| Body/UI                     | Inter (`font-sans`)            | 400-600 | 12-18px |
| Mono                        | System monospace (`font-mono`) | 400     | —       |

### Spacing (8px system)

| Token | Value |
| ----- | ----- |
| xs    | 4px   |
| sm    | 8px   |
| md    | 16px  |
| lg    | 24px  |
| xl    | 32px  |
| 2xl   | 48px  |
| 3xl   | 64px  |
| 4xl   | 96px  |

### Radius

| Token | Value    |
| ----- | -------- |
| sm    | 0.375rem |
| md    | 0.5rem   |
| lg    | 0.75rem  |
| xl    | 1rem     |

### Motion

| Token         | Value                        |
| ------------- | ---------------------------- |
| duration-fast | 120ms                        |
| duration-base | 180ms                        |
| duration-slow | 280ms                        |
| ease-standard | cubic-bezier(0.4, 0, 0.2, 1) |

### Global USD Pricing

| Plan    | Monthly |
| ------- | ------- |
| Free    | $0      |
| Starter | $29     |
| Growth  | $79     |
| Agency  | $199    |
