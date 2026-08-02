import { createServerClient } from "@/lib/db/supabase-server";

export interface ProjectAnalyticsCounts {
  savedCompanies: number;
  buyers: number;
  outreachDrafts: number;
  approvedOutreachDrafts: number;
  aiUsageEvents: number;
  hunterDiscoveryRuns: number;
}

export async function getProjectAnalyticsCounts(
  workspaceId: string,
  projectId: string,
): Promise<ProjectAnalyticsCounts> {
  const supabase = await createServerClient();
  const [companies, buyers, drafts, approvedDrafts, aiUsage, hunterRuns] = await Promise.all([
    count(
      supabase
        .from("project_companies")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId)
        .neq("status", "archived"),
    ),
    count(
      supabase
        .from("company_decision_roles")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId)
        .neq("status", "archived"),
    ),
    count(
      supabase
        .from("outreach_drafts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId)
        .neq("status", "archived"),
    ),
    count(
      supabase
        .from("outreach_drafts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId)
        .eq("status", "approved"),
    ),
    count(
      supabase
        .from("ai_usage_events" as never)
        .select("id" as never, { count: "exact", head: true })
        .eq("workspace_id" as never, workspaceId as never)
        .eq("project_id" as never, projectId as never),
    ),
    count(
      supabase
        .from("company_discovery_runs")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("project_id", projectId)
        .eq("provider", "hunter"),
    ),
  ]);
  return {
    savedCompanies: companies,
    buyers,
    outreachDrafts: drafts,
    approvedOutreachDrafts: approvedDrafts,
    aiUsageEvents: aiUsage,
    hunterDiscoveryRuns: hunterRuns,
  };
}

async function count(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
) {
  const result = await query;
  if (result.error) throw new Error("Analytics count unavailable");
  return result.count ?? 0;
}
