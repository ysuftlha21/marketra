import type { Metadata } from "next";
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
          <div className="container mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
              <div className="lg:col-span-3">
                <Badge variant="outline" tone="accent" className="mb-6">
                  <Target className="mr-1.5 h-3 w-3" /> AI-powered market intelligence
                </Badge>
                <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl sm:leading-tight">
                  Expand into new markets with confidence.
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
                  Marketra brings country analysis, opportunity scoring, ICP planning, and expansion
                  workflows into one research-first platform—so growing SaaS teams can decide where
                  and how to enter.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href="/sign-up"
                    className={cn(buttonVariants({ variant: "default", size: "lg" }))}
                  >
                    Start market research <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                  <Link
                    href="#how-it-works"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                  >
                    See how it works
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
        <section
          id="how-it-works"
          aria-labelledby="workflow-heading"
          className="scroll-mt-20 border-b border-border bg-surface"
        >
          <div className="container mx-auto max-w-6xl px-6 py-24">
            <div className="mb-14">
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
                          i === 3
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

        <PlatformCapabilities />

        {/* ── Product highlight (asymmetric) ── */}
        <section className="border-b border-border bg-muted/20">
          <div className="container mx-auto max-w-6xl px-6 py-24">
            <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
              <div className="lg:col-span-2">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Decision support
                </p>
                <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-foreground">
                  Compare evidence, not assumptions.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  Each market receives a product-specific evaluation of strengths, barriers,
                  localization requirements, and entry potential. Sources stay separate from AI
                  interpretation so teams can review how a recommendation was formed.
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
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Research you can defend
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Decision support built for responsible expansion.
            </h2>
            <div className="mt-10 grid gap-1">
              {[
                {
                  title: "Deterministic scoring",
                  body: "Match scores are computed by code, not by AI. Every score outputs positive reasons, negative reasons, and missing-data indicators. AI only assists with readable explanations.",
                  icon: BarChart3,
                },
                {
                  title: "Research provenance",
                  body: "Sourced facts stay separate from AI interpretation. Confidence and missing-data signals remain visible so teams can assess research quality.",
                  icon: ShieldCheck,
                },
                {
                  title: "Compliance-aware workflows",
                  body: "Decision-maker research is role-led, communication remains review-ready, and Marketra does not automate LinkedIn actions or collect personal data through unauthorized automation.",
                  icon: Target,
                },
                {
                  title: "Workspace isolation",
                  body: "Tenant-owned records are workspace-scoped, with row-level access controls supporting separation between customer workspaces.",
                  icon: ShieldCheck,
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
                <div key={s.step}>
                  <span className="font-display text-3xl text-muted-foreground/40">{s.step}</span>
                  <h3 className="mt-2 text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-col items-center gap-4 border-t border-border pt-10">
              <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                Ready to evaluate your next market?
              </h2>
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ variant: "default", size: "lg" }))}
              >
                Start market research <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
