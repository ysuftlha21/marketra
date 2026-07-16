import { z } from "zod";

export const planIdSchema = z.enum(["free", "starter", "growth", "agency"]);
export type PlanId = z.infer<typeof planIdSchema>;

export const planSchema = z.object({
  id: planIdSchema,
  name: z.string().min(1),
  tagline: z.string().min(1),
  highlight: z.boolean().default(false),
  description: z.string().min(1),
  monthlyPrice: z.number().nonnegative(),
  annualPrice: z.number().nonnegative(),
  maxActiveProjects: z.number().nonnegative(),
  projectCreationsPerPeriod: z.number().nonnegative(),
  decisionRoleGenerationsPerPeriod: z.number().nonnegative(),
  outreachGenerationsPerPeriod: z.number().nonnegative(),
});
export type Plan = z.infer<typeof planSchema>;

export const plans: readonly Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Explore one market",
    highlight: false,
    monthlyPrice: 0,
    annualPrice: 0,
    maxActiveProjects: 1,
    projectCreationsPerPeriod: 2,
    decisionRoleGenerationsPerPeriod: 5,
    outreachGenerationsPerPeriod: 10,
    description:
      "Add one SaaS project, analyze one target country, and discover what Marketra can do.",
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For solo founders",
    highlight: false,
    monthlyPrice: 29,
    annualPrice: 290,
    maxActiveProjects: 5,
    projectCreationsPerPeriod: 20,
    decisionRoleGenerationsPerPeriod: 100,
    outreachGenerationsPerPeriod: 250,
    description: "Multiple target countries, country-specific ICPs, and localized outreach drafts.",
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "For small teams",
    highlight: true,
    monthlyPrice: 79,
    annualPrice: 790,
    maxActiveProjects: 25,
    projectCreationsPerPeriod: 100,
    decisionRoleGenerationsPerPeriod: 1000,
    outreachGenerationsPerPeriod: 2500,
    description: "Broader company discovery, deterministic matching, and the lightweight CRM.",
  },
  {
    id: "agency",
    name: "Agency",
    tagline: "For agencies",
    highlight: false,
    monthlyPrice: 199,
    annualPrice: 1990,
    maxActiveProjects: 100,
    projectCreationsPerPeriod: 500,
    decisionRoleGenerationsPerPeriod: 5000,
    outreachGenerationsPerPeriod: 10000,
    description: "Multiple projects and workspaces, higher usage limits, and audit tracking.",
  },
] as const;

export function getPlan(id: string): Plan | undefined {
  return plans.find((p) => p.id === id);
}
