"use client";
import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Globe2,
  Lock,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  annualPricingEnabled,
  growthTrialEnabled,
  pricingBenefits,
  pricingFaqs,
  pricingPlans,
  type BillingInterval,
  type PricingPlan,
} from "@/config/pricing-page";
import { cn } from "@/lib/utils/cn";

const icons = [Sparkles, Lock, Rocket, RefreshCw, ShieldCheck, Globe2];
function PlanCard({ plan, interval }: { plan: PricingPlan; interval: BillingInterval }) {
  const price = interval === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const trialRequested = plan.cta.action === "trial" && growthTrialEnabled;
  const href = `/sign-up?plan=${plan.id}&interval=${interval}${trialRequested ? "&trial=true" : ""}`;
  return (
    <article
      className={cn(
        "pricing-card group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#15151b]/90 p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_24px_70px_rgba(0,0,0,.28)] motion-reduce:transform-none motion-reduce:transition-none",
        plan.recommended &&
          "pricing-card-featured border-violet-400/60 bg-[#18151f] shadow-[0_20px_65px_rgba(109,40,217,.2)] ring-1 ring-violet-400/20",
      )}
    >
      {plan.recommended && <div className="absolute inset-x-0 top-0 h-0.5 bg-violet-400" />}
      <div className="min-h-36 text-left">
        {plan.badge && (
          <span className="inline-flex rounded-full border border-violet-300/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-200">
            ✦ {plan.badge}
          </span>
        )}
        <h2 className={cn("text-2xl font-semibold", plan.badge ? "mt-3" : "mt-7")}>{plan.name}</h2>
        <p className="mt-2 min-h-10 text-sm leading-5 text-zinc-400">{plan.description}</p>
        <p className="mt-5 text-5xl font-semibold tracking-[-0.04em]">
          {price === null ? "Contact us" : `$${price}`}{" "}
          {price !== null && (
            <span className="text-sm font-normal tracking-normal text-zinc-500">
              /{interval === "annual" ? "year" : "month"}
            </span>
          )}
        </p>
        {interval === "annual" && price !== null && (
          <p className="mt-1.5 text-xs text-violet-300">Two months included</p>
        )}
      </div>
      <div className="my-6 h-px bg-white/10" />
      <div className="flex-1 space-y-5">
        {plan.featureGroups.map((group) => (
          <section key={group.name}>
            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200">
              {group.name}
            </h3>
            <ul className="space-y-2">
              {group.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-xs leading-5 text-zinc-300">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-violet-400" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Link
        href={href}
        className={cn(
          "mt-7 grid h-11 place-items-center rounded-lg border text-sm font-medium transition-[background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#15151b] motion-reduce:transform-none",
          plan.recommended
            ? "border-violet-400 bg-violet-500 text-white shadow-sm hover:-translate-y-0.5 hover:bg-violet-400 hover:shadow-md"
            : "border-white/10 bg-white/[.07] text-zinc-100 hover:border-white/20 hover:bg-white/[.11]",
        )}
      >
        {plan.cta.label}
      </Link>
    </article>
  );
}
export function PricingExperience({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" }) {
  const [interval, setInterval] = React.useState<BillingInterval>("monthly");
  const [faq, setFaq] = React.useState(0);
  const Eyebrow = headingLevel === "h1" ? "h1" : "span";
  return (
    <>
      <section
        id="pricing"
        className="pricing-scene relative overflow-hidden border-b border-white/5 bg-[#0d0d12] px-5 py-24 text-zinc-100 sm:py-28 lg:py-32"
      >
        <div className="pricing-map-pattern absolute inset-0 opacity-20" />
        <div className="relative mx-auto max-w-6xl">
          <div className="text-center">
            <Eyebrow className="inline-flex rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
              Pricing
            </Eyebrow>
            <h2 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Plans for confident <span className="text-violet-300">market expansion.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
              Start with focused market research today.
              <br />
              Scale company intelligence and expansion operations as your program grows.
            </p>
            {annualPricingEnabled && (
              <div
                className="mt-7 inline-flex rounded-xl border border-white/10 bg-black/30 p-1"
                role="group"
                aria-label="Billing interval"
              >
                {(["monthly", "annual"] as const).map((value) => (
                  <button
                    key={value}
                    aria-pressed={interval === value}
                    onClick={() => setInterval(value)}
                    className={cn(
                      "rounded-lg px-4 py-2 text-xs font-medium capitalize transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
                      interval === value
                        ? "bg-violet-500 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-100",
                    )}
                  >
                    {value === "annual" ? "Yearly" : "Monthly"}
                    {value === "annual" && " · Save 2 months"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
            {pricingPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} interval={interval} />
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {pricingBenefits.map((benefit, index) => {
              const Icon = icons[index]!;
              return (
                <span
                  key={benefit}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.045] px-3.5 py-2 text-xs text-zinc-300"
                >
                  <Icon className="h-4 w-4 text-violet-400" />
                  {benefit}
                </span>
              );
            })}
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl border border-white/10 bg-white/[.04] p-6 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                Planning a larger expansion program?
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Talk with Marketra about workspace, usage, and rollout requirements.
              </p>
            </div>
            <Link
              href="mailto:hello@getmarketra.com?subject=Marketra%20expansion%20plan"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[.08] px-4 text-sm font-medium text-zinc-100 transition-colors duration-200 hover:bg-white/[.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            >
              Talk to us <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-[#0d0d12] px-5 pb-24 pt-4 text-zinc-100 sm:pb-28">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Marketra plan questions</h2>
          </div>
          <div className="mt-10 grid gap-3">
            {pricingFaqs.map(([question, answer], index) => {
              const open = faq === index;
              return (
                <div
                  key={question}
                  className={cn(
                    "rounded-xl border bg-white/[.035] transition-colors duration-200",
                    open ? "border-violet-400/30" : "border-white/10 hover:border-white/20",
                  )}
                >
                  <button
                    aria-expanded={open}
                    aria-controls={`faq-${index}`}
                    onClick={() => setFaq(open ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl p-5 text-left text-sm font-medium transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300"
                  >
                    {question}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 motion-reduce:transition-none",
                        open && "rotate-180 text-violet-300",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={`faq-${index}`}
                    hidden={!open}
                    className="px-5 pb-5 text-sm leading-6 text-zinc-400"
                  >
                    {answer}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
