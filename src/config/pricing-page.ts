import { getPriceForCountry } from "./pricing";

export type BillingInterval = "monthly" | "annual";
export interface PricingFeatureGroup {
  name: string;
  features: string[];
}
export interface PricingPlan {
  id: "starter" | "growth" | "agency";
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  currency: "USD";
  recommended?: boolean;
  badge?: string;
  featureGroups: PricingFeatureGroup[];
  limits: Record<string, number | boolean | "unlimited" | "custom">;
  cta: { label: "Start Free Trial"; action: "trial" };
}

export const annualPricingEnabled = true;
export const growthTrialEnabled = true;

function publicPrice(planId: "starter" | "growth" | "agency") {
  const value = getPriceForCountry(planId);
  if (!value) throw new Error(`Missing public USD price for ${planId}.`);
  return { monthlyPrice: value.monthly, annualPrice: value.annual };
}

export const pricingPlans: readonly PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For early-stage SaaS teams validating their first international markets.",
    ...publicPrice("starter"),
    currency: "USD",
    limits: { markets: 3, companies: 1000, buyers: 250, outreach: 100, workspaces: 1, users: 1 },
    cta: { label: "Start Free Trial", action: "trial" },
    featureGroups: [
      {
        name: "AI",
        features: [
          "3 target markets",
          "AI market analysis",
          "Market opportunity scoring",
          "Localized ICP generation",
        ],
      },
      {
        name: "Discovery",
        features: [
          "1,000 company discoveries / month",
          "250 buyer discoveries / month",
          "Basic company and buyer filters",
          "CSV export",
        ],
      },
      {
        name: "Outreach",
        features: [
          "100 AI outreach messages / month",
          "Localized email copy",
          "Basic message templates",
        ],
      },
      {
        name: "Workspace",
        features: [
          "1 workspace · 1 user",
          "Saved market reports",
          "Basic analytics",
          "Community or email support",
        ],
      },
    ],
  },
  {
    id: "growth",
    name: "Pro",
    description: "For growing SaaS teams running repeatable market and company discovery.",
    ...publicPrice("growth"),
    currency: "USD",
    recommended: true,
    badge: "Recommended",
    limits: { markets: "unlimited", companies: 10000, buyers: 2500, outreach: 2000, users: 5 },
    cta: { label: "Start Free Trial", action: "trial" },
    featureGroups: [
      {
        name: "Everything in Starter",
        features: [
          "Unlimited target markets",
          "Advanced market analysis",
          "AI strategy recommendations",
          "Localized ICP variants",
          "Market comparison",
          "Opportunity and risk analysis",
        ],
      },
      {
        name: "Discovery",
        features: [
          "10,000 company discoveries / month",
          "2,500 buyer discoveries / month",
          "Advanced filters and saved searches",
          "Company and buyer enrichment",
          "Priority discovery processing",
        ],
      },
      {
        name: "Outreach",
        features: [
          "2,000 AI outreach messages / month",
          "Market-specific messaging",
          "Buyer-level personalization",
          "Outreach sequences and campaign builder",
          "Template library",
        ],
      },
      {
        name: "Collaboration and integrations",
        features: [
          "Up to 5 users",
          "Team collaboration",
          "CRM and email integrations",
          "API access",
          "Advanced analytics",
          "Priority support",
        ],
      },
    ],
  },
  {
    id: "agency",
    name: "Growth",
    description: "For established teams managing higher-volume global go-to-market programs.",
    ...publicPrice("agency"),
    currency: "USD",
    limits: { markets: "unlimited", companies: 50000, buyers: 10000, outreach: 10000, users: 20 },
    cta: { label: "Start Free Trial", action: "trial" },
    featureGroups: [
      {
        name: "Everything in Pro",
        features: [
          "Unlimited target markets",
          "50,000 company discoveries / month",
          "10,000 buyer discoveries / month",
          "Advanced market portfolio comparisons",
          "Bulk company workflows",
        ],
      },
      {
        name: "Automation and data",
        features: [
          "10,000 AI outreach messages / month",
          "Advanced enrichment workflows",
          "Saved searches and reusable segments",
          "Deterministic scoring explanations",
          "Priority processing",
        ],
      },
      {
        name: "Team operations",
        features: [
          "Up to 20 users",
          "Multiple workspaces",
          "Owner, admin, and member roles",
          "Activity and provider provenance",
          "Advanced analytics",
        ],
      },
      {
        name: "Support",
        features: [
          "Priority support",
          "Guided onboarding",
          "CRM and email integrations",
          "API access",
        ],
      },
    ],
  },
] as const;

export const pricingBenefits = [
  "Continuous AI updates",
  "Secure cloud infrastructure",
  "Regular product improvements",
  "Cancel anytime",
  "Global market coverage",
  "Responsive support",
] as const;
export const pricingFaqs = [
  [
    "Can I upgrade later?",
    "Yes. You can move to a higher plan as your usage and team grow. Upgrades take effect according to the active billing provider’s proration rules.",
  ],
  [
    "Do you offer annual pricing?",
    "Annual billing provides the displayed discounted effective rate when annual pricing is enabled.",
  ],
  [
    "Can I downgrade or cancel?",
    "Yes. Subscription changes follow the active billing terms, including when changes take effect.",
  ],
  [
    "What counts toward usage limits?",
    "Usage may include market analyses, company and buyer discoveries, AI-generated outreach, enrichment operations, and API usage.",
  ],
  [
    "Is there a free trial?",
    "Free trial availability is presented during registration when enabled. No payment success is simulated on this page.",
  ],
  [
    "Do unused credits roll over?",
    "Rollover is not included by default and depends on the active billing policy.",
  ],
  [
    "Which payment methods are supported?",
    "Payment methods are shown by the active BillingProvider during checkout.",
  ],
  [
    "Which plan is right for my team?",
    "Starter supports initial market validation, Pro supports repeatable team workflows, and Growth provides higher limits for established global programs.",
  ],
] as const;
