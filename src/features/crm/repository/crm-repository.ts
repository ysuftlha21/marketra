import { createServerClient } from "@/lib/db/supabase-server";
import type { ProjectCompanyStatus } from "@/features/companies/domain/company-lifecycle";

export interface CrmCompanySourceRow {
  id: string;
  companyId: string;
  targetCountryId: string;
  status: ProjectCompanyStatus;
  fitScore: number;
  reviewed: boolean;
  updatedAt: string;
  companyName: string;
  companyDomain: string | null;
  industry: string;
  countryCode: string;
  sourceProvider: string | null;
}

export interface CrmRelatedActivity {
  companyId: string;
  buyerCount: number;
  draftCount: number;
  latestDraftAt: string | null;
}

export async function listCrmCompanySources(
  workspaceId: string,
  projectId: string,
  targetCountryId?: string,
): Promise<CrmCompanySourceRow[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from("project_companies")
    .select(
      "id,company_id,target_country_id,status,fit_score,reviewed_by,updated_at,companies!inner(canonical_name,primary_domain,industry,country_code,source_provider)",
    )
    .eq("workspace_id", workspaceId)
    .eq("project_id", projectId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (targetCountryId) query = query.eq("target_country_id", targetCountryId);
  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((source) => {
    const row = source as unknown as Record<string, unknown>;
    const company = row.companies as Record<string, unknown>;
    return {
      id: String(row.id),
      companyId: String(row.company_id),
      targetCountryId: String(row.target_country_id),
      status: row.status as ProjectCompanyStatus,
      fitScore: Number(row.fit_score),
      reviewed: typeof row.reviewed_by === "string",
      updatedAt: String(row.updated_at),
      companyName: String(company.canonical_name),
      companyDomain: typeof company.primary_domain === "string" ? company.primary_domain : null,
      industry: String(company.industry),
      countryCode: String(company.country_code),
      sourceProvider: typeof company.source_provider === "string" ? company.source_provider : null,
    };
  });
}

export async function listCrmRelatedActivity(
  workspaceId: string,
  projectId: string,
): Promise<CrmRelatedActivity[]> {
  const supabase = await createServerClient();
  const [buyers, drafts] = await Promise.all([
    supabase
      .from("company_decision_roles")
      .select("company_id")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .neq("status", "archived"),
    supabase
      .from("outreach_drafts")
      .select("company_id,updated_at")
      .eq("workspace_id", workspaceId)
      .eq("project_id", projectId)
      .neq("status", "archived"),
  ]);
  if (buyers.error || drafts.error) throw buyers.error ?? drafts.error;

  const activity = new Map<string, CrmRelatedActivity>();
  const ensure = (companyId: string) => {
    const current = activity.get(companyId) ?? {
      companyId,
      buyerCount: 0,
      draftCount: 0,
      latestDraftAt: null,
    };
    activity.set(companyId, current);
    return current;
  };
  for (const buyer of buyers.data ?? []) ensure(buyer.company_id).buyerCount += 1;
  for (const draft of drafts.data ?? []) {
    const current = ensure(draft.company_id);
    current.draftCount += 1;
    if (!current.latestDraftAt || draft.updated_at > current.latestDraftAt) {
      current.latestDraftAt = draft.updated_at;
    }
  }
  return [...activity.values()];
}
