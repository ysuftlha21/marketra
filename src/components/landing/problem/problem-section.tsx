import { BarChart3, Globe2, MailSearch } from "lucide-react";
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
        "problem-card relative flex min-h-[334px] flex-col overflow-hidden rounded-2xl border bg-white/[.035] p-6 backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:border-violet-400/40",
        index === 0 ? "border-violet-400/60" : "border-white/12",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-14 place-items-center rounded-xl border border-violet-400/25 bg-violet-500/[.06] text-zinc-400">
          <Icon className="size-7" aria-hidden="true" />
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
      <h3 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-100">{card.title}</h3>
      <p className="mt-2 max-w-md text-base leading-6 text-zinc-400">{card.description}</p>
      <Preview id={card.id} />
    </article>
  );
}

function ComparisonPanel() {
  const comparison = problemSection.comparison;
  return (
    <div className="problem-comparison relative mt-12 grid overflow-hidden rounded-2xl border border-violet-400/60 bg-black/20 p-7 shadow-[0_0_50px_rgba(124,58,237,.16)] md:grid-cols-2 md:divide-x md:divide-white/10">
      {[comparison.without, comparison.with].map((column) => (
        <section key={column.title} className="px-3 first:pb-6 md:px-8 md:first:pb-0">
          <h3 className="text-xl font-medium text-zinc-100">{column.title}</h3>
          <ul className="mt-4 grid gap-x-8 gap-y-2 text-sm text-zinc-400 sm:grid-cols-2">
            {column.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true">•</span>
                {item}
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
      className="problem-section relative overflow-hidden border-b border-white/5 bg-[#0c0d12] px-5 py-24 text-zinc-100 sm:py-28"
    >
      <div className="problem-orb absolute left-1/2 top-2/3 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-violet-700/15 blur-[110px]" />
      <div className="relative mx-auto max-w-[1400px]">
        <header className="text-center">
          <span className="inline-flex rounded-lg border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-400">
            {problemSection.badge}
          </span>
          <h2 className="mx-auto mt-8 max-w-6xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {problemSection.title}{" "}
            <span className="bg-gradient-to-r from-fuchsia-300 to-violet-500 bg-clip-text text-transparent">
              {problemSection.highlightedTitle}
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-4xl text-lg leading-8 text-zinc-500 sm:text-xl">
            {problemSection.subtitle}
          </p>
        </header>
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {problemSection.cards.map((card, index) => (
            <ProblemCard key={card.id} card={card} index={index} />
          ))}
        </div>
        <ComparisonPanel />
        <p className="mt-12 text-center text-xl text-zinc-500 sm:text-2xl">
          {problemSection.footerPrefix}{" "}
          <strong className="font-semibold text-violet-400">
            {problemSection.footerHighlight}
          </strong>
        </p>
      </div>
    </section>
  );
}
