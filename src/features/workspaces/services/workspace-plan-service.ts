import { getPlan, type Plan } from "@/config/plans";
import { findWorkspaceSubscription } from "@/features/billing/repository/subscription-repository";
import type { WorkspaceSubscriptionState } from "@/features/billing/domain/subscription";

export interface WorkspacePlanResolution {
  plan: Plan;
  source: "subscription" | "product_default";
  usedFallback: boolean;
}

export function resolveSubscriptionPlan(
  subscription: WorkspaceSubscriptionState | null,
): WorkspacePlanResolution {
  if (
    subscription &&
    ["trialing", "active", "past_due"].includes(subscription.subscription_status)
  ) {
    const subscribedPlan = getPlan(subscription.plan_id);
    if (subscribedPlan)
      return { plan: subscribedPlan, source: "subscription", usedFallback: false };
  }
  const plan = getPlan("free");
  if (!plan) throw new Error("Default workspace plan is unavailable");
  return { plan, source: "product_default", usedFallback: true };
}

export async function resolveWorkspacePlan(workspaceId: string): Promise<WorkspacePlanResolution> {
  const subscription = await findWorkspaceSubscription(workspaceId);
  return resolveSubscriptionPlan(subscription);
}
