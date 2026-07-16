export type DashboardStatus =
  | "loading"
  | "no_workspace"
  | "onboarding_incomplete"
  | "no_project"
  | "no_markets"
  | "analysis_not_started"
  | "analysis_in_progress"
  | "partial"
  | "populated"
  | "error"
  | "demo";

export interface DashboardProjectSummary {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "active";
}
export interface DashboardMarketSummary {
  id: string;
  code: string;
  name: string;
  analysisStatus: "pending" | "running" | "succeeded" | "failed" | null;
}
export interface DashboardMetrics {
  targetMarkets: number;
  matchedCompanies: number | null;
  decisionMakers: number | null;
  activeCampaigns: number;
  opportunityEstimate: string | null;
}
export interface DashboardNextStep {
  title: string;
  description: string;
  href: string;
  action: string;
}
export interface DashboardViewModel {
  status: DashboardStatus;
  workspace: { id: string; name: string } | null;
  project: DashboardProjectSummary | null;
  onboardingComplete: boolean;
  targetMarkets: DashboardMarketSummary[];
  metrics: DashboardMetrics;
  nextSteps: DashboardNextStep[];
  recommendation: null;
  opportunities: [];
  recentActivity: [];
  performance: null;
  isDemoMode: boolean;
  errorMessage?: string;
}

export interface DashboardSnapshot {
  workspace: { id: string; name: string } | null;
  project: DashboardProjectSummary | null;
  markets: DashboardMarketSummary[];
  matchedCompanies: number;
  decisionMakers: number;
  activeCampaigns: number;
}

export function buildDashboardViewModel(snapshot: DashboardSnapshot): DashboardViewModel {
  const { workspace, project, markets } = snapshot;
  let status: DashboardStatus;
  if (!workspace) status = "no_workspace";
  else if (!project) status = "no_project";
  else if (project.status === "draft") status = "onboarding_incomplete";
  else if (markets.length === 0) status = "no_markets";
  else if (markets.every((market) => market.analysisStatus === null))
    status = "analysis_not_started";
  else if (
    markets.some(
      (market) => market.analysisStatus === "pending" || market.analysisStatus === "running",
    )
  )
    status = "analysis_in_progress";
  else if (markets.some((market) => market.analysisStatus === "succeeded"))
    status = snapshot.matchedCompanies > 0 && snapshot.decisionMakers > 0 ? "populated" : "partial";
  else status = "partial";

  const projectBase = project ? `/dashboard/projects/${project.slug}` : "/dashboard/projects/new";
  const nextSteps: DashboardNextStep[] =
    status === "no_workspace"
      ? [
          {
            title: "Create your workspace",
            description: "Set up your organization to begin.",
            href: "/onboarding",
            action: "Continue",
          },
        ]
      : status === "no_project"
        ? [
            {
              title: "Add your SaaS product",
              description: "Create your first Marketra project.",
              href: "/dashboard/projects/new",
              action: "Create",
            },
          ]
        : status === "onboarding_incomplete"
          ? [
              {
                title: "Complete company profile",
                description: "Finish your product and company details.",
                href: `${projectBase}/edit`,
                action: "Continue",
              },
            ]
          : status === "no_markets"
            ? [
                {
                  title: "Select target markets",
                  description: "Choose the countries you want to evaluate.",
                  href: `${projectBase}/markets`,
                  action: "Select",
                },
              ]
            : status === "analysis_not_started"
              ? [
                  {
                    title: "Run market analysis",
                    description: "Analyze your selected target markets.",
                    href: `${projectBase}/markets`,
                    action: "Analyze",
                  },
                ]
              : status === "analysis_in_progress"
                ? [
                    {
                      title: "Market analysis in progress",
                      description: "Open the market workspace to follow progress.",
                      href: `${projectBase}/markets`,
                      action: "View",
                    },
                  ]
                : snapshot.matchedCompanies === 0
                  ? [
                      {
                        title: "Discover companies",
                        description: "Find companies that match your ICP.",
                        href: `${projectBase}/markets`,
                        action: "Discover",
                      },
                    ]
                  : snapshot.decisionMakers === 0
                    ? [
                        {
                          title: "Find decision makers",
                          description: "Identify the right buyer roles.",
                          href: `${projectBase}/markets`,
                          action: "Find",
                        },
                      ]
                    : snapshot.activeCampaigns === 0
                      ? [
                          {
                            title: "Create localized outreach",
                            description: "Create outreach for approved buyer roles.",
                            href: "/dashboard/outreach",
                            action: "Create",
                          },
                        ]
                      : [
                          {
                            title: "Review campaign performance",
                            description: "Monitor your active outreach.",
                            href: "/dashboard/outreach",
                            action: "Review",
                          },
                        ];

  return {
    status,
    workspace,
    project,
    onboardingComplete: project?.status === "active",
    targetMarkets: markets,
    metrics: {
      targetMarkets: markets.length,
      matchedCompanies: markets.some((m) => m.analysisStatus === "succeeded")
        ? snapshot.matchedCompanies
        : null,
      decisionMakers: snapshot.decisionMakers || null,
      activeCampaigns: snapshot.activeCampaigns,
      opportunityEstimate: null,
    },
    nextSteps,
    recommendation: null,
    opportunities: [],
    recentActivity: [],
    performance: null,
    isDemoMode: false,
  };
}
