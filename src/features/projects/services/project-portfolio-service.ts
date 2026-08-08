import { getAuthContext } from "@/lib/auth/session";
import { listWorkspaceProjects } from "../repository/project-repository";
import { listProjectPortfolioActivity } from "../repository/project-portfolio-repository";

export async function listProjectPortfolio(includeArchived = false) {
  const context = await getAuthContext();
  if (!context?.activeWorkspace) return [];
  const workspaceId = context.activeWorkspace.workspace.id;
  const [projects, activity] = await Promise.all([
    listWorkspaceProjects(workspaceId, includeArchived),
    listProjectPortfolioActivity(workspaceId),
  ]);
  const activityMap = new Map(activity.map((item) => [item.projectId, item]));
  return projects.map((project) => ({
    ...project,
    activity: activityMap.get(project.id) ?? {
      projectId: project.id,
      targetMarkets: [],
      productAnalysisReady: false,
      analyzedMarketCount: 0,
      approvedIcpCount: 0,
      companyCount: 0,
      buyerCount: 0,
      outreachDraftCount: 0,
      approvedDraftCount: 0,
    },
  }));
}
