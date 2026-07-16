import { getPlan, type Plan } from "@/config/plans";

export interface WorkspacePlanResolution {
  plan: Plan;
  source: "product_default";
  usedFallback: true;
}

export async function resolveWorkspacePlan(_workspaceId: string): Promise<WorkspacePlanResolution> {
  // TODO(Phase 9 BillingProvider/subscriptions): resolve a validated persisted
  // workspace plan here. Missing, unknown, or malformed subscription data must
  // continue to fall back to the documented Free product default.
  const plan = getPlan("free");
  if (!plan) throw new Error("Default workspace plan is unavailable");
  return { plan, source: "product_default", usedFallback: true };
}
