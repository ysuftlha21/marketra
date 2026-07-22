export type OnboardingStepId =
  "workspace" | "project" | "market" | "company" | "decision_role" | "outreach";

export interface OnboardingFacts {
  hasWorkspace: boolean;
  hasProject: boolean;
  hasMarket: boolean;
  hasCompany: boolean;
  hasDecisionRole: boolean;
  hasOutreach: boolean;
}

const ORDER: readonly OnboardingStepId[] = [
  "workspace",
  "project",
  "market",
  "company",
  "decision_role",
  "outreach",
];

export function deriveOnboardingProgress(facts: OnboardingFacts) {
  const completed = new Set<OnboardingStepId>();
  if (facts.hasWorkspace) completed.add("workspace");
  if (facts.hasProject) completed.add("project");
  if (facts.hasMarket) completed.add("market");
  if (facts.hasCompany) completed.add("company");
  if (facts.hasDecisionRole) completed.add("decision_role");
  if (facts.hasOutreach) completed.add("outreach");
  const nextStep = ORDER.find((step) => !completed.has(step)) ?? null;
  return { completed, nextStep, complete: nextStep === null, total: ORDER.length };
}
