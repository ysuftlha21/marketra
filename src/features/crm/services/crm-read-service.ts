import type { CrmStageId } from "@/config/crm-stages";
import type { ProjectCompanyStatus } from "@/features/companies/domain/company-lifecycle";
import { listCrmCompanySources, listCrmRelatedActivity } from "../repository/crm-repository";

export interface CrmEntry {
  projectCompanyId: string;
  companyId: string;
  companyName: string;
  companyDomain: string | null;
  industry: string;
  countryCode: string;
  targetCountryId: string;
  sourceProvider: string;
  fitScore: number;
  stage: CrmStageId;
  underlyingStatus: ProjectCompanyStatus;
  buyerCount: number;
  draftCount: number;
  ownerLabel: string;
  lastActivityAt: string;
  nextAction: "find_buyers" | "prepare_outreach" | "review_outreach" | "review_company";
}

export async function getCrmEntries(input: {
  workspaceId: string;
  projectId: string;
  targetCountryId?: string;
  stage?: CrmStageId;
}): Promise<CrmEntry[]> {
  const [companies, related] = await Promise.all([
    listCrmCompanySources(input.workspaceId, input.projectId, input.targetCountryId),
    listCrmRelatedActivity(input.workspaceId, input.projectId),
  ]);
  const activity = new Map(related.map((entry) => [entry.companyId, entry]));
  const entries = companies.map((company): CrmEntry => {
    const relatedEntry = activity.get(company.companyId);
    const buyerCount = relatedEntry?.buyerCount ?? 0;
    const draftCount = relatedEntry?.draftCount ?? 0;
    const stage = deriveCrmStage(company.status, buyerCount, draftCount);
    return {
      projectCompanyId: company.id,
      companyId: company.companyId,
      companyName: company.companyName,
      companyDomain: company.companyDomain,
      industry: company.industry,
      countryCode: company.countryCode,
      targetCountryId: company.targetCountryId,
      sourceProvider: company.sourceProvider ?? "manual",
      fitScore: company.fitScore,
      stage,
      underlyingStatus: company.status,
      buyerCount,
      draftCount,
      ownerLabel: company.reviewed ? "Workspace member" : "Unassigned",
      lastActivityAt:
        relatedEntry?.latestDraftAt && relatedEntry.latestDraftAt > company.updatedAt
          ? relatedEntry.latestDraftAt
          : company.updatedAt,
      nextAction:
        draftCount > 0
          ? "review_outreach"
          : buyerCount > 0
            ? "prepare_outreach"
            : company.status === "approved" || company.status === "shortlisted"
              ? "find_buyers"
              : "review_company",
    };
  });
  return input.stage ? entries.filter((entry) => entry.stage === input.stage) : entries;
}

export function deriveCrmStage(
  status: ProjectCompanyStatus,
  buyerCount: number,
  draftCount: number,
): CrmStageId {
  if (status === "rejected" || status === "archived") return "lost";
  if (draftCount > 0) return "outreach-pending";
  if (buyerCount > 0 || status === "approved") return "qualified";
  return "discovered";
}
