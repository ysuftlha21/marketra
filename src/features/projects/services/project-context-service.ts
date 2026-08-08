import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth/session";
import {
  getLatestSuccessfulAnalysisRun,
  getProjectBySlug,
  listWorkspaceProjects,
  type AnalysisRunRow,
  type ProjectRow,
} from "../repository/project-repository";
import {
  listProjectTargetCountries,
  type TargetCountrySummary,
} from "@/features/markets/repository/market-repository";
import {
  getLatestApprovedIcpProfile,
  getLatestIcpProfile,
  type IcpProfileRow,
} from "@/features/icp/repository/icp-repository";
import { createServerClient } from "@/lib/db/supabase-server";
import {
  resolveCanonicalMarketContext,
  type CanonicalMarketContext,
} from "@/features/markets/domain/market-context";

export const ACTIVE_PROJECT_COOKIE = "marketra:active-project";

export type ProjectContextState =
  | "no_workspace"
  | "no_project"
  | "project_inaccessible"
  | "product_context_missing"
  | "product_context_incomplete"
  | "product_analysis_missing"
  | "icp_missing"
  | "icp_incomplete"
  | "markets_missing"
  | "ready";

export type FeatureReadiness = {
  ready: boolean;
  reason:
    | ProjectContextState
    | "market_analysis_missing"
    | "no_saved_company"
    | "no_buyer"
    | "no_outreach_lead"
    | "no_activity";
};

export interface AuthenticatedProjectContext {
  state: ProjectContextState;
  workspaceId: string | null;
  workspaceName: string | null;
  project: ProjectRow | null;
  projects: Array<{ id: string; name: string; slug: string }>;
  markets: TargetCountrySummary[];
  marketContext: CanonicalMarketContext | null;
  activeMarket: TargetCountrySummary | null;
  productAnalysis: AnalysisRunRow | null;
  icp: IcpProfileRow | null;
  latestIcp: IcpProfileRow | null;
  counts: { companies: number; buyers: number; drafts: number; activity: number };
  readiness: {
    project: FeatureReadiness;
    productAnalysis: FeatureReadiness;
    markets: FeatureReadiness;
    marketAnalysis: FeatureReadiness;
    icp: FeatureReadiness;
    companyDiscovery: FeatureReadiness;
    buyerDiscovery: FeatureReadiness;
    outreach: FeatureReadiness;
    campaigns: FeatureReadiness;
    analytics: FeatureReadiness;
    crm: FeatureReadiness;
  };
}

const blocked = (reason: FeatureReadiness["reason"]): FeatureReadiness => ({
  ready: false,
  reason,
});
const ready = (): FeatureReadiness => ({ ready: true, reason: "ready" });

export async function resolveAuthenticatedProjectContext(
  preferredProjectSlug?: string,
): Promise<AuthenticatedProjectContext> {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return emptyContext("no_workspace");
  const workspaceId = ctx.activeWorkspace.workspace.id;
  const workspaceName = ctx.activeWorkspace.workspace.name;

  try {
    const summaries = await listWorkspaceProjects(workspaceId);
    if (summaries.length === 0) return emptyContext("no_project", workspaceId, [], workspaceName);
    const cookieSlug = (await cookies()).get(ACTIVE_PROJECT_COOKIE)?.value;
    const slug = preferredProjectSlug ?? cookieSlug ?? summaries[0]!.slug;
    let project = await getProjectBySlug(workspaceId, slug);
    if (!project && !preferredProjectSlug) {
      project = await getProjectBySlug(workspaceId, summaries[0]!.slug);
    }
    if (!project)
      return emptyContext("project_inaccessible", workspaceId, summaries, workspaceName);

    const markets = await listProjectTargetCountries(workspaceId, project.id);
    const activeMarket =
      markets.find((market) => market.status === "selected") ??
      markets.find((market) => market.status === "shortlisted") ??
      markets[0] ??
      null;
    const [productAnalysis, approvedIcp, latestIcp, counts] = await Promise.all([
      getLatestSuccessfulAnalysisRun(project.id),
      activeMarket ? getLatestApprovedIcpProfile(workspaceId, activeMarket.id) : null,
      activeMarket ? getLatestIcpProfile(workspaceId, activeMarket.id) : null,
      loadFeatureCounts(workspaceId, project.id),
    ]);

    const state = deriveProjectContextState(
      project,
      markets,
      productAnalysis,
      approvedIcp,
      latestIcp,
    );
    const productReady =
      state !== "product_context_missing" && state !== "product_context_incomplete";
    const companyReady = productReady && Boolean(activeMarket && approvedIcp);
    const marketAnalysisReady = Boolean(activeMarket?.has_completed_analysis);
    const marketContext = resolveCanonicalMarketContext(project, markets);
    return {
      state,
      workspaceId,
      workspaceName,
      project,
      projects: summaries.map(({ id, name, slug: projectSlug }) => ({
        id,
        name,
        slug: projectSlug,
      })),
      markets,
      marketContext,
      activeMarket,
      productAnalysis,
      icp: approvedIcp,
      latestIcp,
      counts,
      readiness: {
        project: ready(),
        productAnalysis: productAnalysis ? ready() : blocked("product_analysis_missing"),
        markets: productReady ? ready() : blocked(state),
        marketAnalysis: marketAnalysisReady ? ready() : blocked("market_analysis_missing"),
        icp: approvedIcp
          ? ready()
          : latestIcp
            ? blocked("icp_incomplete")
            : blocked(marketAnalysisReady ? "icp_missing" : "market_analysis_missing"),
        companyDiscovery: companyReady
          ? ready()
          : blocked(marketAnalysisReady ? state : "market_analysis_missing"),
        buyerDiscovery: counts.companies > 0 ? ready() : blocked("no_saved_company"),
        outreach: counts.buyers > 0 ? ready() : blocked("no_buyer"),
        campaigns: counts.drafts > 0 ? ready() : blocked("no_outreach_lead"),
        analytics: counts.activity > 0 ? ready() : blocked("no_activity"),
        crm: counts.activity > 0 ? ready() : blocked("no_activity"),
      },
    };
  } catch {
    return emptyContext("project_inaccessible", workspaceId, [], workspaceName);
  }
}

export function deriveProjectContextState(
  project: ProjectRow,
  markets: TargetCountrySummary[],
  analysis: AnalysisRunRow | null,
  approvedIcp: IcpProfileRow | null,
  latestIcp: IcpProfileRow | null,
): ProjectContextState {
  if (!project.product_description.trim()) return "product_context_missing";
  if (!project.name.trim()) return "product_context_incomplete";
  if (!analysis) return "product_analysis_missing";
  if (markets.length === 0) return "markets_missing";
  if (!latestIcp) return "icp_missing";
  if (!approvedIcp) return "icp_incomplete";
  return "ready";
}

async function loadFeatureCounts(workspaceId: string, projectId: string) {
  const supabase = await createServerClient();
  const [companies, buyers, drafts] = await Promise.all([
    supabase
      .from("project_companies")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId),
    supabase
      .from("company_decision_roles")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .neq("status", "archived"),
    supabase
      .from("outreach_drafts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId),
  ]);
  if (companies.error || buyers.error || drafts.error)
    throw new Error("Context counts unavailable");
  const companyCount = companies.count ?? 0;
  const buyerCount = buyers.count ?? 0;
  const draftCount = drafts.count ?? 0;
  return {
    companies: companyCount,
    buyers: buyerCount,
    drafts: draftCount,
    activity: companyCount + buyerCount + draftCount,
  };
}

function emptyContext(
  state: ProjectContextState,
  workspaceId: string | null = null,
  projects: Array<{ id: string; name: string; slug: string }> = [],
  workspaceName: string | null = null,
): AuthenticatedProjectContext {
  const reason = blocked(state);
  return {
    state,
    workspaceId,
    workspaceName,
    project: null,
    projects,
    markets: [],
    marketContext: null,
    activeMarket: null,
    productAnalysis: null,
    icp: null,
    latestIcp: null,
    counts: { companies: 0, buyers: 0, drafts: 0, activity: 0 },
    readiness: {
      project: reason,
      productAnalysis: reason,
      markets: reason,
      marketAnalysis: reason,
      icp: reason,
      companyDiscovery: reason,
      buyerDiscovery: reason,
      outreach: reason,
      campaigns: reason,
      analytics: blocked("no_activity"),
      crm: blocked("no_activity"),
    },
  };
}

export interface RecommendedProjectAction {
  title: string;
  description: string;
  href: string;
  action: string;
}

export function getRecommendedProjectAction(
  context: AuthenticatedProjectContext,
): RecommendedProjectAction {
  if (!context.project) {
    return {
      title: "Add your SaaS product",
      description: "Create your first Marketra project.",
      href: "/dashboard/projects/new",
      action: "Create",
    };
  }
  const projectBase = `/dashboard/projects/${context.project.slug}`;
  const marketBase = context.activeMarket
    ? `${projectBase}/markets/${context.activeMarket.country_code}`
    : `${projectBase}/markets`;
  if (!context.readiness.productAnalysis.ready) {
    return {
      title: "Analyze your product",
      description: "Turn stored product context into reusable market intelligence.",
      href: projectBase,
      action: "Analyze",
    };
  }
  if (context.markets.length === 0) {
    return {
      title: "Add a target market",
      description: "Choose a country you want to analyze and enter.",
      href: `${projectBase}/markets`,
      action: "Add market",
    };
  }
  if (!context.readiness.marketAnalysis.ready) {
    return {
      title: "Run market analysis",
      description: "Analyze the selected target country before generating its ICP.",
      href: marketBase,
      action: "Analyze",
    };
  }
  if (!context.readiness.icp.ready) {
    return {
      title: "Generate country ICP",
      description: "Create or adapt the ICP for the analyzed target market.",
      href: `${marketBase}/icp`,
      action: "Generate",
    };
  }
  if (context.counts.companies === 0) {
    return {
      title: "Discover companies",
      description: "Find companies matching the approved country ICP.",
      href: `${marketBase}/discovery`,
      action: "Discover",
    };
  }
  if (context.counts.buyers === 0) {
    return {
      title: "Find buyer roles",
      description: "Open a saved company and identify relevant decision makers.",
      href: "/dashboard/companies",
      action: "Find buyers",
    };
  }
  if (context.counts.drafts === 0) {
    return {
      title: "Prepare outreach",
      description: "Create localized outreach for an approved buyer role.",
      href: "/dashboard/outreach",
      action: "Create draft",
    };
  }
  return {
    title: "Review your pipeline",
    description: "Continue from stored company, buyer and outreach activity.",
    href: "/dashboard/crm",
    action: "Open CRM",
  };
}
