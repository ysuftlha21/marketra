import { createServerClient } from "@/lib/db/supabase-server";

export interface ProjectPortfolioActivityRow {
  projectId: string;
  targetMarkets: Array<{ code: string; name: string }>;
  productAnalysisReady: boolean;
  analyzedMarketCount: number;
  approvedIcpCount: number;
  companyCount: number;
  buyerCount: number;
  outreachDraftCount: number;
}

export async function listProjectPortfolioActivity(
  workspaceId: string,
): Promise<ProjectPortfolioActivityRow[]> {
  const supabase = await createServerClient();
  const [targets, productRuns, marketRuns, icps, companies, buyers, drafts] = await Promise.all([
    supabase
      .from("project_target_countries")
      .select("id,project_id,country_code,country_name")
      .eq("workspace_id", workspaceId),
    supabase
      .from("product_analysis_runs")
      .select("project_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "succeeded"),
    supabase
      .from("market_analysis_runs")
      .select("project_id,project_target_country_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "succeeded"),
    supabase
      .from("icp_profiles")
      .select("project_id")
      .eq("workspace_id", workspaceId)
      .eq("status", "approved"),
    supabase
      .from("project_companies")
      .select("project_id")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived"),
    supabase
      .from("company_decision_roles")
      .select("project_id")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived"),
    supabase
      .from("outreach_drafts")
      .select("project_id")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived"),
  ]);
  const errors = [
    targets.error,
    productRuns.error,
    marketRuns.error,
    icps.error,
    companies.error,
    buyers.error,
    drafts.error,
  ].filter(Boolean);
  if (errors.length > 0) throw new Error("Project portfolio activity unavailable");

  const projectIds = new Set<string>();
  for (const collection of [
    targets.data,
    productRuns.data,
    marketRuns.data,
    icps.data,
    companies.data,
    buyers.data,
    drafts.data,
  ]) {
    for (const row of collection ?? []) projectIds.add(row.project_id);
  }
  const countByProject = (rows: Array<{ project_id: string }> | null) => {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
    return counts;
  };
  const productSet = new Set((productRuns.data ?? []).map((row) => row.project_id));
  const marketCounts = new Map<string, Set<string>>();
  for (const row of marketRuns.data ?? []) {
    const set = marketCounts.get(row.project_id) ?? new Set<string>();
    set.add(row.project_target_country_id);
    marketCounts.set(row.project_id, set);
  }
  const targetMap = new Map<string, Array<{ code: string; name: string }>>();
  for (const row of targets.data ?? []) {
    const list = targetMap.get(row.project_id) ?? [];
    list.push({ code: row.country_code, name: row.country_name });
    targetMap.set(row.project_id, list);
  }
  const icpCounts = countByProject(icps.data);
  const companyCounts = countByProject(companies.data);
  const buyerCounts = countByProject(buyers.data);
  const draftCounts = countByProject(drafts.data);
  return [...projectIds].map((projectId) => ({
    projectId,
    targetMarkets: targetMap.get(projectId) ?? [],
    productAnalysisReady: productSet.has(projectId),
    analyzedMarketCount: marketCounts.get(projectId)?.size ?? 0,
    approvedIcpCount: icpCounts.get(projectId) ?? 0,
    companyCount: companyCounts.get(projectId) ?? 0,
    buyerCount: buyerCounts.get(projectId) ?? 0,
    outreachDraftCount: draftCounts.get(projectId) ?? 0,
  }));
}
