import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { buttonVariants } from "@/components/ui/button";
import { plans } from "@/config/plans";
import { formatUsd } from "@/config/pricing";

export const metadata = { title: "Pricing" };

const planFeatures: Record<(typeof plans)[number]["id"], string[]> = {
  free: ["1 SaaS project", "1 target country", "Product analysis (mock)", "Market analysis (mock)"],
  starter: [
    "Up to 3 projects",
    "Multiple target countries",
    "Country-specific ICPs",
    "Localized outreach drafts",
    "Lightweight CRM",
  ],
  growth: [
    "Multiple projects",
    "Broader company discovery",
    "Deterministic match scoring",
    "Higher usage limits",
    "Activity tracking",
  ],
  agency: [
    "Multiple projects & workspaces",
    "Highest usage limits",
    "Audit & cost tracking",
    "Team seats",
    "Priority support",
  ],
};

const audiences: Record<(typeof plans)[number]["id"], string> = {
  free: "Evaluate Marketra with one product.",
  starter: "For a solo founder entering markets.",
  growth: "For a small team evaluating multiple markets.",
  agency: "For agencies managing multiple products or clients.",
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-background">
          <div className="container mx-auto max-w-6xl px-6 py-20">
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
                  Pricing
                </h1>
                <Badge variant="outline" tone="accent" className="translate-y-0.5">
                  Early access
                </Badge>
              </div>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
                One global price. No country-dependent subscriptions. Start free and upgrade as you
                grow.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-surface p-8 transition-all hover:shadow-md",
                    plan.highlight
                      ? "border-primary shadow-lg scale-[1.02] z-10 ring-1 ring-primary/20"
                      : "border-border/60 hover:border-border",
                  )}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                      Most popular
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <h2
                      className={cn(
                        "text-lg font-semibold",
                        plan.highlight ? "text-primary" : "text-foreground",
                      )}
                    >
                      {plan.name}
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                  <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                    {formatUsd(plan.monthlyPrice)}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.annualPrice > 0 ? `${formatUsd(plan.annualPrice)}/yr` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{audiences[plan.id]}</p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-foreground">
                    {planFeatures[plan.id].map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/sign-up"
                    className={cn(
                      buttonVariants({ variant: plan.highlight ? "default" : "outline" }),
                      "mt-6",
                    )}
                  >
                    {plan.id === "free" ? "Start free" : "Choose"}{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
