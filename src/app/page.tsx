import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Target,
  ShieldCheck,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  BrainCircuit,
  LockKeyhole,
  UserCheck,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountryBadge } from "@/components/common/country-badge";
import { PricingExperience } from "@/features/pricing/components/pricing-experience";
import { ProblemSection } from "@/components/landing/problem/problem-section";
import { PlatformCapabilities } from "@/components/landing/platform-capabilities";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = {
  title: "AI-Powered Market Intelligence for International Expansion",
  description:
    "Marketra brings AI market research, country analysis, ICP planning, company intelligence, and expansion workflows into one decision-support platform.",
  keywords: [
    "AI Market Intelligence",
    "Market Expansion",
    "International Expansion",
    "Go-To-Market Intelligence",
    "Market Research",
    "ICP Builder",
    "Company Intelligence",
    "Competitive Research",
  ],
  alternates: { canonical: "https://getmarketra.com/" },
  openGraph: {
    title: "Marketra | AI-Powered Market Intelligence",
    description:
      "Evaluate international markets, build market-specific ICPs, and turn expansion research into coordinated action.",
    url: "https://getmarketra.com/",
    siteName: "Marketra",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Marketra | AI-Powered Market Intelligence",
    description:
      "Evaluate international markets and turn expansion research into coordinated action.",
  },
};

const steps = [
  {
    step: "01",
    title: "Add product context",
    body: "Marketra analyzes your SaaS — capabilities, target customers, and competitive positioning.",
  },
  {
    step: "02",
    title: "Choose a target market",
    body: "Select the countries you want to evaluate and keep each expansion thesis organized by project.",
  },
  {
    step: "03",
    title: "Analyze country conditions",
    body: "Review demand signals, competitive conditions, barriers, and localization requirements.",
  },
  {
    step: "04",
    title: "Build a market-specific ICP",
    body: "Translate the market analysis into a focused ideal customer profile for that country.",
  },
  {
    step: "05",
    title: "Research relevant companies",
    body: "Find and assess businesses that match the selected market and ICP direction.",
  },
  {
    step: "06",
    title: "Identify decision-maker roles",
    body: "Map the roles and buying responsibilities relevant to the market opportunity.",
  },
  {
    step: "07",
    title: "Prepare localized communication",
    body: "Create review-ready messaging informed by country, company, and decision-role context.",
  },
  {
    step: "08",
    title: "Track expansion progress",
    body: "Coordinate campaigns, CRM activity, and analytics without losing the original research context.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="border-b border-border bg-background">
          <div className="container mx-auto max-w-6xl px-6 py-20 sm:py-24 lg:py-28">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
              <div>
                <Badge variant="outline" tone="accent" className="mb-6 rounded-full px-3 py-1.5">
                  <Target className="mr-1.5 h-3 w-3" /> AI-powered market intelligence
                </Badge>
                <h1 className="max-w-2xl text-balance font-display text-4xl font-medium leading-[1.08] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl">
                  Expand into new markets with confidence.
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                  Marketra brings country analysis, opportunity scoring, ICP planning, and expansion
                  workflows into one research-first platform—so growing SaaS teams can decide where
                  and how to enter.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/sign-up"
                    className={cn(
                      buttonVariants({ variant: "default", size: "lg" }),
                      "h-12 rounded-lg px-6 shadow-sm transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none",
                    )}
                  >
                    Start market research <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                  <Link
                    href="#how-it-works"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "h-12 rounded-lg px-6 text-muted-foreground transition-[background-color,color,border-color] duration-200 hover:border-foreground/20 hover:text-foreground",
                    )}
                  >
                    See how it works
                  </Link>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  No credit card required. Free plan available.
                </p>
              </div>
              <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
                <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/[.05] blur-3xl" />
                <Card className="overflow-hidden rounded-2xl border-border/70 bg-surface shadow-[0_24px_70px_rgba(15,23,42,.12)] ring-1 ring-border/40 dark:shadow-[0_24px_70px_rgba(0,0,0,.35)]">
                  <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/30 px-4">
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-danger/80" />
                      <div className="h-2.5 w-2.5 rounded-full bg-warning/80" />
                      <div className="h-2.5 w-2.5 rounded-full bg-success/80" />
                    </div>
                    <div className="ml-4 flex h-6 flex-1 items-center justify-center rounded-md border border-border/50 bg-background px-3 text-[10px] text-muted-foreground shadow-sm">
                      app.marketra.com/compare
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Market comparison
                    </span>
                    <Badge variant="outline" tone="info" className="text-[10px]">
                      Preview
                    </Badge>
                  </div>
                  <div className="space-y-3 p-4 sm:p-5">
                    {[
                      {
                        code: "DE",
                        name: "Germany",
                        rec: "Investigate",
                        conf: "medium",
                        strengths: "High SaaS adoption, English-friendly business",
                        barriers: "Localization opens mid-market",
                        region: "Europe",
                      },
                      {
                        code: "GB",
                        name: "United Kingdom",
                        rec: "Pursue",
                        conf: "medium",
                        strengths: "Native English, mature SaaS demand",
                        barriers: "Crowded mid-market segment",
                        region: "Europe",
                      },
                      {
                        code: "TR",
                        name: "Turkey",
                        rec: "Investigate",
                        conf: "low",
                        strengths: "Growing tech ecosystem",
                        barriers: "Currency and payment complexity",
                        region: "M.East & Africa",
                      },
                    ].map((m) => (
                      <div
                        key={m.code}
                        className="rounded-xl border border-border/60 bg-background/70 px-3.5 py-3 transition-colors duration-200 hover:border-primary/25"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <CountryBadge countryCode={m.code} showName={false} />
                            <span className="text-sm font-semibold text-foreground">{m.name}</span>
                            <span className="hidden text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
                              {m.region}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                              m.rec === "Pursue"
                                ? "bg-primary/10 text-primary ring-primary/20"
                                : m.rec === "Investigate"
                                  ? "bg-accent/10 text-accent ring-accent/20"
                                  : "bg-muted text-muted-foreground ring-border",
                            )}
                          >
                            {m.rec} · {m.conf}
                          </span>
                        </div>
                        <div className="mt-2.5 grid gap-1.5 text-[11px]">
                          <div className="flex items-start gap-1">
                            <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                            <span className="text-muted-foreground">{m.strengths}</span>
                          </div>
                          <div className="flex items-start gap-1">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground">{m.barriers}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border px-4 py-2">
                    <p className="text-[10px] text-muted-foreground">
                      Synthetic preview — based on mock product analysis.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <ProblemSection />

        {/* ── Workflow (connected process) ── */}
        <section
          id="how-it-works"
          aria-labelledby="workflow-heading"
          className="scroll-mt-20 border-b border-border bg-surface"
        >
          <div className="container mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <div className="mb-12 max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                How it works
              </p>
              <h2
                id="workflow-heading"
                className="mt-2 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
              >
                From market question to coordinated expansion plan.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Market research leads the workflow. Company intelligence and communication follow
                only after a clear market and ICP direction exists.
              </p>
            </div>
            <div className="grid items-start gap-14 lg:grid-cols-[1.15fr_.85fr] lg:gap-20">
              <div className="space-y-5">
                {steps.map((s, i) => (
                  <div
                    key={s.step}
                    className="group relative flex gap-5 rounded-xl p-2 transition-colors duration-200 hover:bg-background/70"
                  >
                    {i < steps.length - 1 && (
                      <div className="absolute bottom-[-1.25rem] left-7 top-12 w-px bg-border" />
                    )}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm ring-4 ring-surface transition-colors duration-200",
                          i === 3
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-background text-muted-foreground group-hover:border-primary/30 group-hover:text-foreground",
                        )}
                      >
                        {s.step}
                      </div>
                    </div>
                    <div className="pb-3 pt-2">
                      <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                      <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">
                        {s.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <aside className="rounded-2xl border border-border/70 bg-background p-6 shadow-sm lg:sticky lg:top-28 lg:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  One connected workflow
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                  Research stays attached to every decision.
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Each later action retains the market, ICP, and evidence context that informed it.
                </p>
                <div className="mt-6 space-y-2.5">
                  {[
                    ["Research", "Product and country intelligence"],
                    ["Decide", "Opportunity scoring and ICP"],
                    ["Activate", "Companies, roles, and communication"],
                    ["Measure", "CRM progress and analytics"],
                  ].map(([stage, detail], index) => (
                    <div
                      key={stage}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface px-3.5 py-3"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{stage}</p>
                        <p className="text-xs text-muted-foreground">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 text-success" aria-hidden="true" />
                  Human review remains part of the workflow.
                </div>
              </aside>
            </div>
          </div>
        </section>

        <PlatformCapabilities />

        {/* ── Product highlight (asymmetric) ── */}
        <section className="border-b border-border bg-muted/20">
          <div className="container mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
            <div className="grid items-start gap-14 lg:grid-cols-5 lg:gap-20">
              <div className="lg:sticky lg:top-28 lg:col-span-2">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Decision support
                </p>
                <h2 className="mt-3 text-balance font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                  Compare evidence, not assumptions.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Each market receives a product-specific evaluation of strengths, barriers,
                  localization requirements, and entry potential. Sources stay separate from AI
                  interpretation so teams can review how a recommendation was formed.
                </p>
                <ul className="mt-7 space-y-3.5">
                  {[
                    {
                      icon: ShieldCheck,
                      label: "Sourced facts separated from AI interpretation",
                      color: "text-success" as const,
                    },
                    {
                      icon: Target,
                      label: "Product-country fit with confidence scoring",
                      color: "text-primary" as const,
                    },
                    {
                      icon: BarChart3,
                      label: "Side-by-side comparison of analyzed markets",
                      color: "text-accent" as const,
                    },
                  ].map((item) => (
                    <li key={item.label} className="flex items-start gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-background shadow-sm">
                        <item.icon className={cn("h-4 w-4", item.color)} aria-hidden="true" />
                      </span>
                      <span className="pt-1 text-sm text-foreground">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4 lg:col-span-3">
                {[
                  {
                    code: "DE",
                    name: "Germany",
                    rec: "Investigate" as const,
                    conf: "Medium",
                    strengths: [
                      "High SaaS adoption",
                      "English-friendly business culture",
                      "Mature procurement processes",
                    ],
                    barriers: ["Localization opens mid-market", "Data residency expectations"],
                  },
                  {
                    code: "GB",
                    name: "United Kingdom",
                    rec: "Pursue" as const,
                    conf: "Medium",
                    strengths: [
                      "Native English market",
                      "Well-defined SaaS customer segments",
                      "Stable regulatory framework",
                    ],
                    barriers: ["Crowded mid-market", "Higher CAC expectations"],
                  },
                ].map((item) => (
                  <div
                    key={item.code}
                    className="overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/60 px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <CountryBadge countryCode={item.code} showName={false} />
                        <div>
                          <span className="font-semibold text-foreground">{item.name}</span>
                          <p className="text-[11px] text-muted-foreground">Country assessment</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                          {item.conf} confidence
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                            item.rec === "Pursue"
                              ? "bg-success/10 text-success ring-success/20"
                              : "bg-accent/10 text-accent ring-accent/20",
                          )}
                        >
                          {item.rec}
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                      <div className="rounded-xl border border-success/15 bg-success/[.035] p-4">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-success">
                          Strength signals
                        </p>
                        <div className="space-y-2">
                          {item.strengths.map((s) => (
                            <div key={s} className="flex items-start gap-2 text-xs leading-5">
                              <CheckCircle className="mt-1 h-3 w-3 shrink-0 text-success" />
                              <span className="text-muted-foreground">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-warning/15 bg-warning/[.035] p-4">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-warning">
                          Entry considerations
                        </p>
                        <div className="space-y-2">
                          {item.barriers.map((b) => (
                            <div key={b} className="flex items-start gap-2 text-xs leading-5">
                              <AlertTriangle className="mt-1 h-3 w-3 shrink-0 text-warning" />
                              <span className="text-muted-foreground">{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-center text-[11px] text-muted-foreground">
                  Synthetic preview — mock product data
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Principles (editorial) ── */}
        <section className="border-b border-border bg-background">
          <div className="container mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Research you can defend
              </p>
              <h2 className="mt-3 text-balance font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Decision support built for responsible expansion.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                Marketra keeps evidence, AI interpretation, and human judgment distinct—so teams can
                move faster without losing accountability.
              </p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Deterministic scoring",
                  body: "Scores are computed by code with positive, negative, and missing-data reasons—not hidden AI judgment.",
                  icon: BarChart3,
                },
                {
                  title: "Research provenance",
                  body: "Sourced facts stay separate from interpretation, with confidence and missing-data signals visible.",
                  icon: ShieldCheck,
                },
                {
                  title: "Human review",
                  body: "Recommendations and communication drafts remain review-ready. Teams decide what moves forward.",
                  icon: UserCheck,
                },
                {
                  title: "Responsible AI",
                  body: "AI supports analysis and explanation without secretly determining scores or inventing market evidence.",
                  icon: BrainCircuit,
                },
                {
                  title: "Compliance-aware workflows",
                  body: "Role-led research and review-first communication avoid automatic LinkedIn actions and unauthorized collection.",
                  icon: Target,
                },
                {
                  title: "Privacy and workspace isolation",
                  body: "Workspace-scoped records and row-level access controls support separation between customer workspaces.",
                  icon: LockKeyhole,
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="group flex items-start gap-4 rounded-2xl border border-border/70 bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-primary/25 hover:shadow-sm"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary shadow-sm">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing (global USD) ── */}
        <PricingExperience />

        {/* ── CTA ── */}
        <section className="bg-background">
          <div className="container mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Add product context",
                  body: "Capture your SaaS category, positioning, and target customer.",
                },
                {
                  step: "2",
                  title: "Select expansion markets",
                  body: "Choose the countries you want to evaluate first.",
                },
                {
                  step: "3",
                  title: "Review market intelligence",
                  body: "Compare recommendations, confidence, and opportunity signals.",
                },
              ].map((s) => (
                <div key={s.step} className="rounded-xl border border-border/70 bg-surface p-5">
                  <span className="text-xs font-semibold text-primary">0{s.step}</span>
                  <h3 className="mt-3 text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-border bg-muted/30 px-6 py-12 text-center sm:py-14">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Your next market decision starts here
              </p>
              <h2 className="mt-3 text-balance font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                Ready to evaluate your next market?
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Bring your product context. Marketra will help structure the research and compare
                the evidence.
              </p>
              <Link
                href="/sign-up"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "mt-6 h-12 rounded-lg px-7 shadow-sm transition-[background-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none",
                )}
              >
                Start market research <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                No credit card required. Free plan available.
              </p>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
