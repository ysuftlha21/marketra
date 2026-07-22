"use client";
import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Globe2,
  Lock,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  X,
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
function PlanCard({
  plan,
  interval,
  onContact,
}: {
  plan: PricingPlan;
  interval: BillingInterval;
  onContact: () => void;
}) {
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
          {price === null ? plan.priceLabel : `$${price}`}{" "}
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
      {plan.cta.action === "contact-sales" ? (
        <button
          type="button"
          onClick={onContact}
          className="mt-6 h-11 rounded-lg border border-violet-400/70 text-sm text-violet-300 hover:bg-violet-500/10"
        >
          {plan.cta.label}
        </button>
      ) : (
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
      )}
    </article>
  );
}
function ContactDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = React.useState<"idle" | "unavailable">("idle");
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sales-title"
    >
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-2xl">
        <div className="flex justify-between">
          <div>
            <h2 id="sales-title" className="text-xl font-semibold">
              Contact Sales
            </h2>
            <p className="text-sm text-zinc-500">Tell us about your expansion requirements.</p>
          </div>
          <button aria-label="Close contact sales" onClick={onClose}>
            <X />
          </button>
        </div>
        {status === "unavailable" ? (
          <div className="py-16 text-center">
            <AlertTriangle className="mx-auto text-amber-400" />
            <p className="mt-3 font-semibold">Sales delivery is not configured yet</p>
            <p className="text-sm text-zinc-500">
              Your information was not sent or stored. Please try again after the contact provider
              is enabled.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStatus("unavailable");
            }}
            className="mt-6 grid gap-3 sm:grid-cols-2"
          >
            {[
              ["workEmail", "Work email", "email"],
              ["company", "Company", "text"],
              ["role", "Role", "text"],
              ["teamSize", "Team size", "text"],
              ["currentMarkets", "Current markets", "text"],
              ["targetMarkets", "Target markets", "text"],
            ].map(([name, label, type]) => (
              <label key={name} className="text-xs text-zinc-400">
                {label}
                <input
                  required
                  name={name}
                  type={type}
                  className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm"
                />
              </label>
            ))}
            <label className="text-xs text-zinc-400 sm:col-span-2">
              Message
              <textarea
                required
                name="message"
                className="mt-1 min-h-24 w-full rounded-md border border-white/10 bg-black/20 p-3 text-sm"
              />
            </label>
            <button className="h-11 rounded-lg bg-violet-600 text-sm sm:col-span-2">
              Submit request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
export function PricingExperience({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" }) {
  const [interval, setInterval] = React.useState<BillingInterval>("monthly");
  const [contact, setContact] = React.useState(false);
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
                    {value}
                    {value === "annual" && " · Save 2 months"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:items-start">
            {pricingPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                interval={interval}
                onContact={() => setContact(true)}
              />
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
      <ContactDialog open={contact} onClose={() => setContact(false)} />
    </>
  );
}
