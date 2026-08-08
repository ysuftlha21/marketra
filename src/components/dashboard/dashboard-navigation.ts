export type DashboardModule =
  | "dashboard"
  | "projects"
  | "markets"
  | "companies"
  | "buyers"
  | "icp"
  | "outreach"
  | "campaigns"
  | "crm"
  | "analytics"
  | "onboarding"
  | "billing"
  | "settings";

interface RouteDefinition {
  module: DashboardModule;
  patterns: RegExp[];
}

// Specific nested workflows must precede their broader project and market parents.
const dashboardRoutes: RouteDefinition[] = [
  {
    module: "icp",
    patterns: [
      /^\/dashboard\/icp(?:\/|$)/,
      /^\/dashboard\/projects\/[^/]+\/(?:icp|markets\/[^/]+\/icp)(?:\/|$)/,
    ],
  },
  {
    module: "buyers",
    patterns: [
      /^\/dashboard\/buyers(?:\/|$)/,
      /^\/dashboard\/projects\/[^/]+\/(?:buyers)(?:\/|$)/,
      /^\/dashboard\/projects\/[^/]+\/markets\/[^/]+\/discovery\/(?!runs(?:\/|$))[^/]+(?:\/|$)/,
    ],
  },
  {
    module: "companies",
    patterns: [
      /^\/dashboard\/companies(?:\/|$)/,
      /^\/dashboard\/projects\/[^/]+\/(?:companies)(?:\/|$)/,
      /^\/dashboard\/projects\/[^/]+\/markets\/[^/]+\/discovery(?:\/runs(?:\/|$)|$)/,
    ],
  },
  {
    module: "outreach",
    patterns: [
      /^\/dashboard\/(?:outreach|communication)(?:\/|$)/,
      /^\/dashboard\/projects\/[^/]+\/(?:outreach|communication)(?:\/|$)/,
    ],
  },
  {
    module: "campaigns",
    patterns: [
      /^\/dashboard\/campaigns(?:\/|$)/,
      /^\/dashboard\/projects\/[^/]+\/campaigns(?:\/|$)/,
    ],
  },
  {
    module: "crm",
    patterns: [/^\/dashboard\/crm(?:\/|$)/, /^\/dashboard\/projects\/[^/]+\/crm(?:\/|$)/],
  },
  {
    module: "analytics",
    patterns: [
      /^\/dashboard\/analytics(?:\/|$)/,
      /^\/dashboard\/projects\/[^/]+\/analytics(?:\/|$)/,
    ],
  },
  {
    module: "markets",
    patterns: [/^\/dashboard\/markets(?:\/|$)/, /^\/dashboard\/projects\/[^/]+\/markets(?:\/|$)/],
  },
  {
    module: "projects",
    patterns: [/^\/dashboard\/projects(?:\/[^/]+(?:\/edit)?|\/new)?\/?$/],
  },
  {
    module: "billing",
    patterns: [/^\/dashboard\/(?:billing|settings\/billing)(?:\/|$)/],
  },
  {
    module: "settings",
    patterns: [/^\/dashboard\/settings(?:\/|$)/],
  },
  {
    module: "onboarding",
    patterns: [/^\/dashboard\/(?:onboarding|getting-started)(?:\/|$)/],
  },
  { module: "dashboard", patterns: [/^\/dashboard\/?$/] },
];

export function resolveDashboardModule(pathname: string): DashboardModule | null {
  return (
    dashboardRoutes.find((route) => route.patterns.some((pattern) => pattern.test(pathname)))
      ?.module ?? null
  );
}

export function isDashboardNavigationActive(pathname: string, module: DashboardModule): boolean {
  return resolveDashboardModule(pathname) === module;
}
