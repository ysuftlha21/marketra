import type { ProjectStatus } from "./project-status";

export interface ProjectPortfolioActivity {
  targetMarkets: Array<{ code: string; name: string }>;
  productAnalysisReady: boolean;
  analyzedMarketCount: number;
  approvedIcpCount: number;
  companyCount: number;
  buyerCount: number;
  outreachDraftCount: number;
  approvedDraftCount: number;
}

export interface ProjectPortfolioItem {
  slug: string;
  status: ProjectStatus;
  activity: ProjectPortfolioActivity;
}

export const PROJECT_PROGRESS_STAGES = [
  "Project created",
  "Markets selected",
  "Research completed",
  "ICP ready",
  "Companies reviewed",
  "Decision makers reviewed",
  "Communication ready",
  "Campaign ready",
  "CRM active",
] as const;

export type ProjectHealth =
  "healthy" | "needs_research" | "incomplete" | "draft" | "ready" | "archived";

export interface ProjectPortfolioView {
  stages: Array<{ label: (typeof PROJECT_PROGRESS_STAGES)[number]; complete: boolean }>;
  completedStageCount: number;
  progressPercent: number;
  health: ProjectHealth;
  healthLabel: string;
  nextAction: { label: string; description: string; href: string };
}

export function formatProjectHostname(websiteUrl: string | null): string | null {
  if (!websiteUrl) return null;
  try {
    return new URL(websiteUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const healthLabels: Record<ProjectHealth, string> = {
  healthy: "Healthy",
  needs_research: "Needs research",
  incomplete: "Incomplete",
  draft: "Draft",
  ready: "Ready",
  archived: "Archived",
};

export function deriveProjectPortfolioView(project: ProjectPortfolioItem): ProjectPortfolioView {
  const activity = project.activity;
  const hasMarkets = activity.targetMarkets.length > 0;
  const researchCompleted =
    activity.productAnalysisReady &&
    hasMarkets &&
    activity.analyzedMarketCount >= activity.targetMarkets.length;
  const icpReady = researchCompleted && activity.approvedIcpCount > 0;
  const companiesReviewed = icpReady && activity.companyCount > 0;
  const decisionMakersReviewed = companiesReviewed && activity.buyerCount > 0;
  const communicationReady = decisionMakersReviewed && activity.outreachDraftCount > 0;
  const campaignReady = communicationReady && activity.approvedDraftCount > 0;
  const crmActive = companiesReviewed;
  const values = [
    true,
    hasMarkets,
    researchCompleted,
    icpReady,
    companiesReviewed,
    decisionMakersReviewed,
    communicationReady,
    campaignReady,
    crmActive,
  ];
  const stages = PROJECT_PROGRESS_STAGES.map((label, index) => ({
    label,
    complete: values[index] ?? false,
  }));
  const completedStageCount = stages.filter((stage) => stage.complete).length;
  const health = deriveHealth(project, {
    hasMarkets,
    researchCompleted,
    icpReady,
    companiesReviewed,
    communicationReady,
    campaignReady,
  });

  return {
    stages,
    completedStageCount,
    progressPercent: Math.round((completedStageCount / stages.length) * 100),
    health,
    healthLabel: healthLabels[health],
    nextAction: deriveNextAction(project, {
      hasMarkets,
      researchCompleted,
      icpReady,
      companiesReviewed,
      decisionMakersReviewed,
      communicationReady,
      campaignReady,
    }),
  };
}

function deriveHealth(
  project: ProjectPortfolioItem,
  state: {
    hasMarkets: boolean;
    researchCompleted: boolean;
    icpReady: boolean;
    companiesReviewed: boolean;
    communicationReady: boolean;
    campaignReady: boolean;
  },
): ProjectHealth {
  if (project.status === "archived") return "archived";
  if (state.campaignReady) return "ready";
  if (state.icpReady && state.companiesReviewed) return "healthy";
  if (!state.hasMarkets) return project.status === "draft" ? "draft" : "incomplete";
  if (!state.researchCompleted) return "needs_research";
  if (!state.icpReady || !state.communicationReady) return "incomplete";
  return "healthy";
}

function deriveNextAction(
  project: ProjectPortfolioItem,
  state: {
    hasMarkets: boolean;
    researchCompleted: boolean;
    icpReady: boolean;
    companiesReviewed: boolean;
    decisionMakersReviewed: boolean;
    communicationReady: boolean;
    campaignReady: boolean;
  },
) {
  const projectBase = `/dashboard/projects/${project.slug}`;
  const marketCode = project.activity.targetMarkets[0]?.code;
  const marketBase = marketCode ? `${projectBase}/markets/${marketCode}` : `${projectBase}/markets`;

  if (project.status === "archived") {
    return {
      label: "Review archived project",
      description: "Open the workspace to restore or review its history.",
      href: projectBase,
    };
  }
  if (!state.hasMarkets) {
    return {
      label: "Add your first market",
      description: "Choose a country to begin market evaluation.",
      href: `${projectBase}/markets`,
    };
  }
  if (!project.activity.productAnalysisReady) {
    return {
      label: "Analyze product context",
      description: "Create the research foundation for every target market.",
      href: projectBase,
    };
  }
  if (!state.researchCompleted) {
    return {
      label: "Continue market research",
      description: "Complete analysis for the selected target markets.",
      href: `${projectBase}/markets`,
    };
  }
  if (!state.icpReady) {
    return {
      label: "Review market ICP",
      description: "Build and approve the customer profile for this market.",
      href: `${marketBase}/icp`,
    };
  }
  if (!state.companiesReviewed) {
    return {
      label: "Research companies",
      description: "Find companies aligned with the approved market ICP.",
      href: `${marketBase}/discovery`,
    };
  }
  if (!state.decisionMakersReviewed) {
    return {
      label: "Identify decision makers",
      description: "Research the relevant roles inside saved companies.",
      href: "/dashboard/companies",
    };
  }
  if (!state.communicationReady) {
    return {
      label: "Prepare communication",
      description: "Create a localized, review-ready communication draft.",
      href: "/dashboard/outreach",
    };
  }
  if (!state.campaignReady) {
    return {
      label: "Review communication drafts",
      description: "Approve a draft before adding it to campaign planning.",
      href: "/dashboard/outreach",
    };
  }
  return {
    label: "Open project CRM",
    description: "Continue from stored company and communication activity.",
    href: `/dashboard/crm?project=${encodeURIComponent(project.slug)}`,
  };
}
