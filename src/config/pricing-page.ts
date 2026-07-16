export type BillingInterval = "monthly" | "annual";
export interface PricingFeatureGroup {
  name: string;
  features: string[];
}
export interface PricingPlan {
  id: "starter" | "growth" | "enterprise";
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  priceLabel?: string;
  currency: "USD";
  recommended?: boolean;
  badge?: string;
  featureGroups: PricingFeatureGroup[];
  limits: Record<string, number | boolean | "unlimited" | "custom">;
  cta: { label: string; action: "register" | "trial" | "contact-sales" };
}

export const annualPricingEnabled = true;
export const pricingPlans: readonly PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For early-stage SaaS teams validating their first international markets.",
    monthlyPrice: 49,
    annualPrice: 490,
    currency: "USD",
    limits: { markets: 3, companies: 1000, buyers: 250, outreach: 100, workspaces: 1, users: 1 },
    cta: { label: "Get Started", action: "register" },
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
    name: "Growth",
    description: "For SaaS companies actively expanding into multiple markets.",
    monthlyPrice: 149,
    annualPrice: 1490,
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
    id: "enterprise",
    name: "Enterprise",
    description:
      "For global SaaS organizations with advanced data, security, and operational requirements.",
    monthlyPrice: null,
    annualPrice: null,
    priceLabel: "Custom Pricing",
    currency: "USD",
    limits: { usage: "custom", users: "unlimited", workspaces: "custom" },
    cta: { label: "Contact Sales", action: "contact-sales" },
    featureGroups: [
      {
        name: "Everything in Growth",
        features: [
          "Contract-based usage",
          "Unlimited users",
          "Multiple workspaces",
          "Custom limits and data coverage",
          "Bulk operations",
        ],
      },
      {
        name: "AI and data",
        features: [
          "Custom AI configurations",
          "Custom market scoring models",
          "Private data-source connections",
          "Advanced enrichment",
          "Data residency options",
        ],
      },
      {
        name: "Security",
        features: [
          "SSO / SAML",
          "SCIM provisioning",
          "Role-based access controls",
          "Audit logs",
          "Advanced security controls",
          "Dedicated infrastructure options",
        ],
      },
      {
        name: "Service",
        features: [
          "Dedicated success manager",
          "White-glove onboarding",
          "Custom integrations",
          "SLA",
          "Priority feature requests",
          "Quarterly strategy reviews",
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
    "Growth trial availability is presented during registration when enabled. No payment success is simulated on this page.",
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
    "Can Enterprise plans be customized?",
    "Yes. Enterprise plans may include custom limits, integrations, security controls, data coverage, and service terms.",
  ],
] as const;
