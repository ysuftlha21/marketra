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
    ProjectContextState | "company_missing" | "buyer_missing" | "draft_missing" | "activity_empty";
};

export interface AuthenticatedProjectContext {
  state: ProjectContextState;
  workspaceId: string | null;
  project: ProjectRow | null;
  projects: Array<{ id: string; name: string; slug: string }>;
  markets: TargetCountrySummary[];
  activeMarket: TargetCountrySummary | null;
  productAnalysis: AnalysisRunRow | null;
  icp: IcpProfileRow | null;
  latestIcp: IcpProfileRow | null;
  counts: { companies: number; buyers: number; drafts: number; activity: number };
  readiness: {
    markets: FeatureReadiness;
    companyDiscovery: FeatureReadiness;
    buyerDiscovery: FeatureReadiness;
    outreach: FeatureReadiness;
    campaigns: FeatureReadiness;
    analytics: FeatureReadiness;
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

  try {
    const summaries = await listWorkspaceProjects(workspaceId);
    if (summaries.length === 0) return emptyContext("no_project", workspaceId);
    const cookieSlug = (await cookies()).get(ACTIVE_PROJECT_COOKIE)?.value;
    const slug = preferredProjectSlug ?? cookieSlug ?? summaries[0]!.slug;
    let project = await getProjectBySlug(workspaceId, slug);
    if (!project && !preferredProjectSlug) {
      project = await getProjectBySlug(workspaceId, summaries[0]!.slug);
    }
    if (!project) return emptyContext("project_inaccessible", workspaceId, summaries);

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
    return {
      state,
      workspaceId,
      project,
      projects: summaries.map(({ id, name, slug: projectSlug }) => ({
        id,
        name,
        slug: projectSlug,
      })),
      markets,
      activeMarket,
      productAnalysis,
      icp: approvedIcp,
      latestIcp,
      counts,
      readiness: {
        markets: productReady ? ready() : blocked(state),
        companyDiscovery: companyReady ? ready() : blocked(state),
        buyerDiscovery: counts.companies > 0 ? ready() : blocked("company_missing"),
        outreach: counts.buyers > 0 ? ready() : blocked("buyer_missing"),
        campaigns: counts.drafts > 0 ? ready() : blocked("draft_missing"),
        analytics: counts.activity > 0 ? ready() : blocked("activity_empty"),
      },
    };
  } catch {
    return emptyContext("project_inaccessible", workspaceId);
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
): AuthenticatedProjectContext {
  const reason = blocked(state);
  return {
    state,
    workspaceId,
    project: null,
    projects,
    markets: [],
    activeMarket: null,
    productAnalysis: null,
    icp: null,
    latestIcp: null,
    counts: { companies: 0, buyers: 0, drafts: 0, activity: 0 },
    readiness: {
      markets: reason,
      companyDiscovery: reason,
      buyerDiscovery: reason,
      outreach: reason,
      campaigns: reason,
      analytics: blocked("activity_empty"),
    },
  };
}
