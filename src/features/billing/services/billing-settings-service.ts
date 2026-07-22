import { findWorkspaceSubscription } from "../repository/subscription-repository";
import { resolveWorkspacePlan } from "@/features/workspaces/services/workspace-plan-service";
import { getWorkspaceUsage } from "@/features/workspaces/services/workspace-usage-service";
import { summarizeAiUsage } from "@/features/ai-usage/repository/ai-usage-repository";

export async function getBillingSettings(workspaceId: string) {
  const [resolution, subscription, usage, aiUsage] = await Promise.all([
    resolveWorkspacePlan(workspaceId),
    findWorkspaceSubscription(workspaceId),
    getWorkspaceUsage(workspaceId),
    summarizeAiUsage(workspaceId),
  ]);
  return { resolution, subscription, usage, aiUsage };
}
