import { createServerClient } from "@/lib/db/supabase-server";
import { listWorkspaceProjects } from "@/features/projects/repository/project-repository";
import { listProjectTargetCountries } from "@/features/markets/repository/market-repository";
import type { DashboardSnapshot } from "../domain/dashboard-view-model";

export async function loadDashboardSnapshot(
  workspace: {
    id: string;
    name: string;
  },
  activeProjectId?: string,
): Promise<DashboardSnapshot> {
  const projects = await listWorkspaceProjects(workspace.id);
  const selected =
    projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
  if (!selected)
    return {
      workspace,
      project: null,
      markets: [],
      matchedCompanies: 0,
      decisionMakers: 0,
      activeCampaigns: 0,
    };
  const supabase = await createServerClient();
  const [markets, companies, roles, campaigns] = await Promise.all([
    listProjectTargetCountries(workspace.id, selected.id),
    supabase
      .from("project_companies")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("project_id", selected.id)
      .is("archived_at", null),
    supabase
      .from("company_decision_roles")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("project_id", selected.id)
      .neq("status", "archived"),
    supabase
      .from("outreach_generation_runs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("project_id", selected.id)
      .in("status", ["pending", "running"]),
  ]);
  return {
    workspace,
    project: {
      id: selected.id,
      name: selected.name,
      slug: selected.slug,
      status: selected.status === "draft" ? "draft" : "active",
    },
    markets: markets.map((market) => ({
      id: market.id,
      code: market.country_code,
      name: market.country_name,
      analysisStatus: market.latest_analysis_status,
    })),
    matchedCompanies: companies.count ?? 0,
    decisionMakers: roles.count ?? 0,
    activeCampaigns: campaigns.count ?? 0,
  };
}
