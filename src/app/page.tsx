import Link from "next/link";
import {
  ArrowRight,
  Target,
  ShieldCheck,
  BarChart3,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountryBadge } from "@/components/common/country-badge";
import { PricingExperience } from "@/features/pricing/components/pricing-experience";
import { ProblemSection } from "@/components/landing/problem/problem-section";
import { cn } from "@/lib/utils/cn";

const steps = [
  {
    step: "01",
    title: "Describe your product",
    body: "Marketra analyzes your SaaS — capabilities, target customers, and competitive positioning.",
  },
  {
    step: "02",
    title: "Choose target countries",
    body: "Select markets from our catalog. Each country receives a structured product-specific analysis.",
  },
  {
    step: "03",
    title: "Assess product-market fit",
    body: "Get recommendations with confidence levels, strength signals, and identified barriers for each market.",
  },
  {
    step: "04",
    title: "Compare and decide",
    body: "Evaluate countries side-by-side. Shortlist the best candidates and move forward with confidence.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="border-b border-border bg-background">
          <div className="container mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
              <div className="lg:col-span-3">
                <Badge variant="outline" tone="accent" className="mb-6">
                  <Target className="mr-1.5 h-3 w-3" /> Market entry platform
                </Badge>
                <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl sm:leading-tight">
                  Compare markets before you commit.
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                  Marketra evaluates your SaaS against target countries so you can decide where to
                  go first — with structured evidence, not intuition.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/sign-up"
                    className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                  >
                    Start free <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                  <Link
                    href="/pricing"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                  >
                    View pricing
                  </Link>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  No credit card required. Free plan available.
                </p>
              </div>
              <div className="lg:col-span-2">
                <Card className="overflow-hidden border-border/60 bg-surface shadow-lg ring-1 ring-border/50">
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
                  <div className="p-5 space-y-4">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Market comparison
                    </span>
                    <Badge variant="outline" tone="info" className="text-[10px]">
                      Preview
                    </Badge>
                  </div>
                  <div className="p-4 space-y-3">
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
                        strengths: "Native English, mature SaaS buyer",
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
                        className="rounded-md border border-border/40 bg-muted/20 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CountryBadge countryCode={m.code} />
                            <span className="text-sm font-semibold text-foreground">{m.name}</span>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              {m.region}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                              m.rec === "Pursue"
                                ? "bg-primary/10 text-primary"
                                : m.rec === "Investigate"
                                  ? "bg-accent/10 text-accent"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {m.rec} · {m.conf}
                          </span>
                        </div>
                        <div className="mt-1.5 grid gap-1 text-[11px]">
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
        <section className="border-b border-border bg-surface">
          <div className="container mx-auto max-w-6xl px-6 py-24">
            <div className="mb-14">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                How it works
              </p>
              <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                From product to market decision in four steps.
              </h2>
            </div>
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
              <div className="space-y-12">
                {steps.map((s, i) => (
                  <div key={s.step} className="relative flex gap-6">
                    {i < steps.length - 1 && (
                      <div className="absolute left-5 top-14 h-full w-0.5 bg-border/50" />
                    )}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm ring-4 ring-background z-10",
                          i === 2
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface border border-border text-foreground",
                        )}
                      >
                        {s.step}
                      </div>
                    </div>
                    <div className="pt-2 pb-6">
                      <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden lg:flex items-center justify-center">
                <div className="w-full max-w-sm rounded-xl border border-border/60 bg-surface p-8 shadow-lg ring-1 ring-border/50">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="h-2 w-24 rounded-full bg-primary/20" />
                      <div className="h-4 w-3/4 rounded-full bg-border/40" />
                      <div className="h-4 w-full rounded-full bg-border/40" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-16 rounded-full bg-accent/20" />
                      <div className="h-4 w-5/6 rounded-full bg-border/40" />
                      <div className="h-4 w-full rounded-full bg-border/40" />
                    </div>
                    <div className="space-y-2 pt-4">
                      <div className="h-10 w-full rounded-md bg-primary/10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Product highlight (asymmetric) ── */}
        <section className="border-b border-border bg-muted/20">
          <div className="container mx-auto max-w-6xl px-6 py-24">
            <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
              <div className="lg:col-span-2">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  How it helps
                </p>
                <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-foreground">
                  Evidence over instinct.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Each market gets a product-specific evaluation. Strengths, barriers, localization
                  requirements, and an entry recommendation. Sources stay separate from AI
                  interpretation.
                </p>
                <ul className="mt-6 space-y-3">
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
                      <item.icon className={cn("mt-0.5 h-5 w-5 shrink-0", item.color)} />
                      <span className="text-sm text-foreground">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-3 space-y-3">
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
                      "Well-defined SaaS buyer segments",
                      "Stable regulatory framework",
                    ],
                    barriers: ["Crowded mid-market", "Higher CAC expectations"],
                  },
                ].map((item) => (
                  <div
                    key={item.code}
                    className="rounded-lg border border-border/60 bg-surface p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CountryBadge countryCode={item.code} />
                        <span className="font-semibold text-foreground">{item.name}</span>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                          item.rec === "Pursue"
                            ? "bg-success/10 text-success"
                            : "bg-accent/10 text-accent",
                        )}
                      >
                        {item.rec} · {item.conf}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        {item.strengths.map((s) => (
                          <div key={s} className="flex items-start gap-1.5 text-xs">
                            <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                            <span className="text-muted-foreground">{s}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        {item.barriers.map((b) => (
                          <div key={b} className="flex items-start gap-1.5 text-xs">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground">{b}</span>
                          </div>
                        ))}
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
          <div className="container mx-auto max-w-6xl px-6 py-24">
            <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Explainable by design.
            </h2>
            <div className="mt-10 grid gap-1">
              {[
                {
                  title: "Deterministic scoring",
                  body: "Match scores are computed by code, not by AI. Every score outputs positive reasons, negative reasons, and missing-data indicators. AI only assists with readable explanations.",
                  icon: BarChart3,
                },
                {
                  title: "Privacy-first architecture",
                  body: "Role-based recommendations only. No LinkedIn automation. No scraping of personal contact data. Decision-maker guidance is role-based, not contact-based.",
                  icon: ShieldCheck,
                },
                {
                  title: "Workspace isolation",
                  body: "Every tenant-owned record carries workspace_id. Row-level security enforced at the database level. Cross-workspace access is blocked by RLS.",
                  icon: Target,
                },
              ].map((item, i) => (
                <div
                  key={item.title}
                  className={cn(
                    "flex items-start gap-6 border-t py-6 first:border-t-0",
                    i === 0 && "pt-2",
                  )}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing (global USD) ── */}
        <PricingExperience />

        {/* ── CTA ── */}
        <section className="bg-background">
          <div className="container mx-auto max-w-6xl px-6 py-24">
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Add your product",
                  body: "Describe your SaaS, website, and target customers.",
                },
                {
                  step: "2",
                  title: "Choose markets",
                  body: "Select target countries from our catalog.",
                },
                {
                  step: "3",
                  title: "Compare evidence",
                  body: "Get recommendations with confidence and fit signals.",
                },
              ].map((s) => (
                <div key={s.step}>
                  <span className="font-display text-3xl text-muted-foreground/40">{s.step}</span>
                  <h3 className="mt-2 text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-col items-center gap-4 border-t border-border pt-10">
              <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                Ready to compare markets?
              </h2>
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ variant: "default", size: "lg" }))}
              >
                Start free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
