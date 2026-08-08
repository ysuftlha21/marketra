import { BarChart3, Check, Globe2, MailSearch, X } from "lucide-react";
import { problemSection, type ProblemCardId } from "@/config/problem-section";
import { cn } from "@/lib/utils/cn";

const cardIcons = { market: Globe2, customers: BarChart3, outreach: MailSearch } as const;

function MarketPreview() {
  const preview = problemSection.marketPreview;
  return (
    <div
      className="problem-map relative mt-auto h-36 overflow-hidden"
      aria-label={preview.scoreLabel}
    >
      <svg viewBox="0 0 520 150" className="h-full w-full" role="img" aria-label="Dim market map">
        <path
          d="M23 45 54 28l45 6 22 22-9 24-42 5-12 25-25-15Zm110-10 33-17 62 9 28 29-10 40-32 8-18 34-37-13-7-33-30-26Zm135 12 42-25 78 8 28 20 62 16-11 28-55 2-33 31-42-10-16-36-48-8Z"
          fill="rgba(96,92,122,.28)"
          stroke="rgba(161,145,205,.2)"
        />
        <path d="M55 49 88 40l18 17-12 20-31-3Z" fill="rgba(229,113,123,.5)" />
        <path d="m301 46 13-8 9 8-6 12-13-2Z" fill="rgba(229,113,123,.42)" />
      </svg>
      <div className="absolute right-1 top-1 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
        <p className="text-[10px] text-zinc-500">{preview.scoreLabel}</p>
        <p className="text-sm font-semibold text-red-400">{preview.score}</p>
      </div>
    </div>
  );
}

function DiscoveryPreview() {
  const preview = problemSection.discoveryPreview;
  return (
    <div className="mt-auto grid grid-cols-[1fr_1.03fr] gap-3 text-[8px] text-zinc-500">
      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <p className="mb-2 text-[9px] text-zinc-300">{preview.companiesLabel}</p>
        {preview.companies.map((company, index) => (
          <div key={company} className="flex justify-between border-t border-white/5 py-1.5">
            <span>{company}</span>
            <span>{32 + index * 5}%</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-white/10 bg-black/20 p-2">
        <p className="mb-2 text-[9px] text-zinc-300">{preview.buyersLabel}</p>
        {preview.buyers.map((buyer) => (
          <div key={buyer} className="border-t border-white/5 py-2">
            {buyer}
          </div>
        ))}
      </div>
    </div>
  );
}

function OutreachPreview() {
  return (
    <div className="mt-auto grid grid-cols-3 gap-2">
      {problemSection.outreachPreview.map((market) => (
        <div
          key={market.country}
          className="overflow-hidden rounded-lg border border-white/10 bg-black/20"
        >
          <p className="border-b border-white/10 px-2 py-2 text-[9px] text-zinc-300">
            {market.flag} &nbsp;{market.country}
          </p>
          <p className="line-clamp-4 px-2 py-2 text-[8px] leading-3 text-zinc-500">
            {problemSection.outreachMessage}
          </p>
          <span className="m-2 inline-flex rounded bg-red-500/10 px-1.5 py-1 text-[8px] text-red-400">
            {problemSection.lowReplyLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

function Preview({ id }: { id: ProblemCardId }) {
  if (id === "market") return <MarketPreview />;
  if (id === "customers") return <DiscoveryPreview />;
  return <OutreachPreview />;
}

function ProblemCard({
  card,
  index,
}: {
  card: (typeof problemSection.cards)[number];
  index: number;
}) {
  const Icon = cardIcons[card.id];
  return (
    <article
      className={cn(
        "problem-card relative flex min-h-[332px] flex-col overflow-hidden rounded-2xl border bg-white/[.035] p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-violet-400/40 hover:shadow-[0_18px_50px_rgba(0,0,0,.22)] motion-reduce:transform-none motion-reduce:transition-none",
        index === 0 ? "border-violet-400/60" : "border-white/12",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-xl border border-violet-400/25 bg-violet-500/[.06] text-violet-300">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs",
            index === 0
              ? "border-red-400/20 bg-red-500/10 text-red-400"
              : "border-amber-400/20 bg-amber-500/10 text-amber-300",
          )}
        >
          {card.status}
        </span>
      </div>
      <h3 className="mt-5 text-xl font-semibold tracking-tight text-zinc-100">{card.title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">{card.description}</p>
      <Preview id={card.id} />
    </article>
  );
}

function ComparisonPanel() {
  const comparison = problemSection.comparison;
  return (
    <div className="problem-comparison relative mt-10 grid overflow-hidden rounded-2xl border border-white/10 bg-black/20 md:grid-cols-2">
      {[comparison.without, comparison.with].map((column, index) => (
        <section
          key={column.title}
          className={cn(
            "p-7 sm:p-8",
            index === 0
              ? "border-b border-white/10 bg-white/[.02] md:border-b-0 md:border-r"
              : "bg-violet-500/[.06]",
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full border",
                index === 0
                  ? "border-zinc-700 bg-zinc-900 text-zinc-500"
                  : "border-violet-400/30 bg-violet-500/10 text-violet-300",
              )}
            >
              {index === 0 ? (
                <X className="size-4" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
            </span>
            <h3 className="text-lg font-semibold text-zinc-100">{column.title}</h3>
          </div>
          <ul className="mt-5 grid gap-x-8 gap-y-3 text-sm text-zinc-400 sm:grid-cols-2">
            {column.items.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-2 size-1.5 shrink-0 rounded-full",
                    index === 0 ? "bg-zinc-700" : "bg-violet-400",
                  )}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ProblemSection() {
  return (
    <section
      id="problem"
      className="problem-section relative overflow-hidden border-b border-white/5 bg-[#0c0d12] px-5 py-24 text-zinc-100 sm:py-28 lg:py-32"
    >
      <div className="problem-orb absolute left-1/2 top-2/3 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-violet-700/15 blur-[110px]" />
      <div className="relative mx-auto max-w-6xl">
        <header className="text-center">
          <span className="inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
            {problemSection.badge}
          </span>
          <h2 className="mx-auto mt-6 max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {problemSection.title}{" "}
            <span className="bg-gradient-to-r from-fuchsia-300 to-violet-500 bg-clip-text text-transparent">
              {problemSection.highlightedTitle}
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-zinc-400 sm:text-lg">
            {problemSection.subtitle}
          </p>
        </header>
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {problemSection.cards.map((card, index) => (
            <ProblemCard key={card.id} card={card} index={index} />
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] text-zinc-600">
          Illustrative interface previews — example data only.
        </p>
        <ComparisonPanel />
        <p className="mx-auto mt-10 max-w-2xl text-center text-lg text-zinc-400 sm:text-xl">
          {problemSection.footerPrefix}{" "}
          <strong className="font-semibold text-violet-400">
            {problemSection.footerHighlight}
          </strong>
        </p>
      </div>
    </section>
  );
}
