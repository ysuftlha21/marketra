"use client";
import * as React from "react";
import Link from "next/link";
import {
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
        "pricing-card flex flex-col rounded-2xl border border-white/10 bg-[#15151b]/90 p-6",
        plan.recommended &&
          "pricing-card-featured border-violet-400/70 shadow-[0_0_55px_rgba(139,92,246,.28)] lg:-translate-y-4",
      )}
    >
      <div className="min-h-32 text-center">
        {plan.badge && (
          <span className="inline-flex rounded-full border border-violet-300/35 bg-black/40 px-4 py-1 text-xs text-violet-200">
            ✦ {plan.badge}
          </span>
        )}
        <h2 className="mt-3 text-2xl font-semibold">{plan.name}</h2>
        <p className="mt-2 min-h-10 text-xs leading-5 text-zinc-400">{plan.description}</p>
        <p className="mt-4 text-5xl font-semibold tracking-tight">
          {price === null ? "Contact us" : `$${price}`}{" "}
          {price !== null && (
            <span className="text-base font-normal text-zinc-500">
              /{interval === "annual" ? "year" : "month"}
            </span>
          )}
        </p>
        {interval === "annual" && price !== null && (
          <p className="mt-1 text-[10px] text-violet-300">Save 2 months</p>
        )}
      </div>
      <div className="my-5 h-px bg-white/10" />
      <div className="flex-1 space-y-4">
        {plan.featureGroups.map((group) => (
          <section key={group.name}>
            <h3 className="mb-2 border-b border-white/10 pb-2 text-sm font-semibold">
              {group.name}
            </h3>
            <ul className="space-y-1.5">
              {group.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-xs leading-5 text-zinc-300">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-violet-400" />
                  {feature}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Link
        href={href}
        className={cn(
          "mt-6 grid h-11 place-items-center rounded-lg text-sm",
          plan.recommended
            ? "bg-gradient-to-r from-violet-600 to-violet-400 text-white"
            : "bg-white/10 text-zinc-100 hover:bg-white/15",
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
        className="pricing-scene relative overflow-hidden border-b border-white/5 bg-[#0d0d12] px-5 pb-20 pt-20 text-zinc-100"
      >
        <div className="pricing-map-pattern absolute inset-0 opacity-20" />
        <div className="relative mx-auto max-w-6xl">
          <div className="text-center">
            <Eyebrow className="inline-flex rounded-lg border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-widest text-violet-300">
              Pricing
            </Eyebrow>
            <h2 className="mt-8 text-4xl font-semibold tracking-tight sm:text-6xl">
              Simple pricing.{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 to-violet-500 bg-clip-text text-transparent">
                Scale globally.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-500">
              Choose the plan that fits your team today.
              <br />
              Upgrade anytime as your business grows.
            </p>
            {annualPricingEnabled && (
              <div
                className="mt-7 inline-flex rounded-lg border border-white/10 bg-black/30 p-1"
                role="group"
                aria-label="Billing interval"
              >
                {(["monthly", "annual"] as const).map((value) => (
                  <button
                    key={value}
                    aria-pressed={interval === value}
                    onClick={() => setInterval(value)}
                    className={cn(
                      "rounded-md px-4 py-2 text-xs capitalize",
                      interval === value ? "bg-violet-600 text-white" : "text-zinc-400",
                    )}
                  >
                    {value === "annual" ? "Yearly" : "Monthly"}
                    {value === "annual" && " · Save 2 months"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:items-start">
            {pricingPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} interval={interval} />
            ))}
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {pricingBenefits.map((benefit, index) => {
              const Icon = icons[index]!;
              return (
                <span
                  key={benefit}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[.06] px-3 py-2 text-xs text-zinc-300"
                >
                  <Icon className="h-4 w-4 text-violet-400" />
                  {benefit}
                </span>
              );
            })}
          </div>
        </div>
      </section>
      <section className="bg-[#0d0d12] px-5 py-20 text-zinc-100">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-semibold">Pricing questions</h2>
          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {pricingFaqs.map(([question, answer], index) => {
              const open = faq === index;
              return (
                <div key={question} className="rounded-xl border border-white/10 bg-white/[.04]">
                  <button
                    aria-expanded={open}
                    aria-controls={`faq-${index}`}
                    onClick={() => setFaq(open ? -1 : index)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm font-medium"
                  >
                    {question}
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
                    />
                  </button>
                  <div
                    id={`faq-${index}`}
                    hidden={!open}
                    className="px-5 pb-5 text-xs leading-5 text-zinc-400"
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
