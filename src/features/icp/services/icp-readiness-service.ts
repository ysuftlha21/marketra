import { getAuthContext } from "@/lib/auth/session";
import { getProjectBySlug } from "@/features/projects/repository/project-repository";
import { getTargetCountryByCode } from "@/features/markets/repository/market-repository";
import {
  getLatestApprovedIcpProfile,
  getLatestIcpProfile,
  type IcpProfileRow,
} from "../repository/icp-repository";

export type ProjectIcpReadiness =
  | { state: "missing"; projectId: string; targetCountryId: string }
  | {
      state: "incomplete";
      projectId: string;
      targetCountryId: string;
      profile: IcpProfileRow;
      incompleteSections: string[];
    }
  | {
      state: "ready";
      projectId: string;
      targetCountryId: string;
      profile: IcpProfileRow;
    }
  | { state: "inaccessible" };

export function getIncompleteIcpSections(profile: IcpProfileRow): string[] {
  const sections: string[] = [];
  if (!profile.name.trim() || !profile.summary.trim()) sections.push("Profile summary");
  if (Object.keys(profile.industry_segments ?? {}).length === 0) sections.push("Industries");
  if (Object.keys(profile.company_attributes ?? {}).length === 0)
    sections.push("Company attributes");
  if (profile.status !== "approved") sections.push("Approval");
  return sections;
}

/** Resolves ICP state from the authenticated workspace; route/client workspace IDs are never used. */
export async function getProjectIcpReadiness(
  projectSlug: string,
  countryCode: string,
): Promise<ProjectIcpReadiness> {
  const ctx = await getAuthContext();
  if (!ctx?.activeWorkspace) return { state: "inaccessible" };

  const workspaceId = ctx.activeWorkspace.workspace.id;
  try {
    const project = await getProjectBySlug(workspaceId, projectSlug);
    if (!project) return { state: "inaccessible" };
    const targetCountry = await getTargetCountryByCode(workspaceId, project.id, countryCode);
    if (!targetCountry) return { state: "inaccessible" };

    // A newer draft must not hide an existing approved version that discovery can safely use.
    const approved = await getLatestApprovedIcpProfile(workspaceId, targetCountry.id);
    if (approved) {
      return {
        state: "ready",
        projectId: project.id,
        targetCountryId: targetCountry.id,
        profile: approved,
      };
    }

    const latest = await getLatestIcpProfile(workspaceId, targetCountry.id);
    if (!latest) {
      return { state: "missing", projectId: project.id, targetCountryId: targetCountry.id };
    }
    return {
      state: "incomplete",
      projectId: project.id,
      targetCountryId: targetCountry.id,
      profile: latest,
      incompleteSections: getIncompleteIcpSections(latest),
    };
  } catch {
    // RLS/query failures must not be mislabeled as an absent ICP.
    return { state: "inaccessible" };
  }
}
