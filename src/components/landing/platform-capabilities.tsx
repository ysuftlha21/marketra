import {
  BarChart3,
  Building2,
  ChartNoAxesCombined,
  Compass,
  Crosshair,
  Globe2,
  MessagesSquare,
  Network,
  UsersRound,
} from "lucide-react";

const capabilities = [
  {
    title: "AI Market Research",
    description:
      "Turn product context and target-country questions into a structured research brief.",
    icon: Globe2,
    stage: "Research",
  },
  {
    title: "Country Analysis",
    description:
      "Review demand signals, competitive conditions, barriers, and localization requirements.",
    icon: Compass,
    stage: "Research",
  },
  {
    title: "ICP Builder",
    description:
      "Define a market-specific ideal customer profile grounded in the country analysis.",
    icon: Crosshair,
    stage: "Plan",
  },
  {
    title: "Market Opportunity Scoring",
    description:
      "Compare markets with explainable recommendations, confidence levels, and fit signals.",
    icon: ChartNoAxesCombined,
    stage: "Decide",
  },
  {
    title: "Company Intelligence",
    description:
      "Research relevant businesses after the market and ICP direction has been established.",
    icon: Building2,
    stage: "Activate",
  },
  {
    title: "Decision Maker Research",
    description:
      "Identify the roles and buying responsibilities most relevant to the expansion thesis.",
    icon: UsersRound,
    stage: "Activate",
  },
  {
    title: "AI Communication Assistant",
    description:
      "Prepare localized, review-ready communication informed by market and decision-role context.",
    icon: MessagesSquare,
    stage: "Activate",
  },
  {
    title: "Expansion Campaigns",
    description:
      "Coordinate approved market communication and keep execution tied to the original research.",
    icon: Network,
    stage: "Coordinate",
  },
  {
    title: "Expansion Workspace",
    description:
      "Organize CRM activity, research history, and analytics in one market expansion workspace.",
    icon: BarChart3,
    stage: "Measure",
  },
] as const;

export function PlatformCapabilities() {
  return (
    <section
      id="product"
      aria-labelledby="platform-capabilities-heading"
      className="scroll-mt-20 border-b border-border bg-background"
    >
      <div className="container mx-auto max-w-6xl px-6 py-24 sm:py-28">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Market intelligence platform
          </p>
          <h2
            id="platform-capabilities-heading"
            className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
          >
            One research-to-execution workspace for international expansion.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Start with the market decision. Then carry the evidence into company research,
            decision-maker planning, localized communication, CRM, and performance analysis.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => (
            <article
              key={capability.title}
              className="group rounded-xl border border-border/70 bg-surface p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-within:border-primary/40 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-primary">
                  <capability.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {capability.stage}
                </span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">{capability.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {capability.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
