import { buildDashboardViewModel, type DashboardViewModel } from "../domain/dashboard-view-model";
import { loadDashboardSnapshot } from "../repository/dashboard-repository";

export async function getDashboardViewModel(
  workspace: {
    id: string;
    name: string;
  },
  activeProjectId?: string,
): Promise<DashboardViewModel> {
  const snapshot = await loadDashboardSnapshot(workspace, activeProjectId);
  return buildDashboardViewModel(snapshot);
}
