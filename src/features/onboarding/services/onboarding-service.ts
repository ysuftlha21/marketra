import { createServerClient } from "@/lib/db/supabase-server";
import { deriveOnboardingProgress } from "../domain/onboarding-progress";

export async function getOnboardingProgress(workspaceId: string) {
  const client = await createServerClient();
  const { data: project } = await client
    .from("projects")
    .select("id, slug")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!project) {
    return {
      ...deriveOnboardingProgress({
        hasWorkspace: true,
        hasProject: false,
        hasMarket: false,
        hasCompany: false,
        hasDecisionRole: false,
        hasOutreach: false,
      }),
      project: null,
      market: null,
    };
  }
  const { data: market } = await client
    .from("project_target_countries")
    .select("id, country_code")
    .eq("workspace_id", workspaceId)
    .eq("project_id", project.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const [company, role, outreach] = await Promise.all([
    client
      .from("project_companies")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("project_id", project.id),
    client
      .from("company_decision_roles")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("project_id", project.id),
    client
      .from("outreach_drafts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("project_id", project.id),
  ]);
  return {
    ...deriveOnboardingProgress({
      hasWorkspace: true,
      hasProject: true,
      hasMarket: Boolean(market),
      hasCompany: (company.count ?? 0) > 0,
      hasDecisionRole: (role.count ?? 0) > 0,
      hasOutreach: (outreach.count ?? 0) > 0,
    }),
    project,
    market,
  };
}
