export const RATE_LIMIT_OPERATIONS = [
  "signup",
  "signin_failure",
  "password_reset",
  "signup_confirmation_resend",
  "auth_callback",
  "company_discovery",
  "buyer_discovery",
  "email_enrichment",
  "email_verification",
  "hunter_readiness",
  "product_analysis",
  "market_analysis",
  "company_scoring",
  "outreach_generation",
  "ai_generation",
  "project_creation",
  "manual_company_creation",
  "company_saving",
  "outreach_handoff",
  "sensitive_export",
  "billing_checkout",
  "billing_portal",
  "billing_webhook",
  "billing_plan_change",
  "decision_role_generation",
  "campaign_creation",
  "message_scheduling",
  "mailbox_send",
] as const;
export type RateLimitOperation = (typeof RATE_LIMIT_OPERATIONS)[number];
export type RateLimitScope = "ip" | "user" | "workspace_user" | "workspace" | "project";
export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
  scope: RateLimitScope;
  failClosed: boolean;
}

const policy = (
  limit: number,
  windowSeconds: number,
  scope: RateLimitScope,
  failClosed = true,
): RateLimitPolicy => ({ limit, windowSeconds, scope, failClosed });
export const RATE_LIMIT_POLICIES: Record<RateLimitOperation, RateLimitPolicy> = {
  signup: policy(5, 3600, "ip"),
  signin_failure: policy(10, 900, "ip"),
  password_reset: policy(3, 3600, "ip"),
  signup_confirmation_resend: policy(3, 3600, "ip"),
  auth_callback: policy(30, 300, "ip"),
  company_discovery: policy(10, 60, "workspace_user"),
  buyer_discovery: policy(10, 60, "workspace_user"),
  email_enrichment: policy(10, 60, "workspace_user"),
  email_verification: policy(20, 60, "workspace_user"),
  hunter_readiness: policy(6, 60, "user", false),
  product_analysis: policy(5, 60, "workspace_user"),
  market_analysis: policy(5, 60, "workspace_user"),
  company_scoring: policy(20, 60, "workspace_user"),
  outreach_generation: policy(10, 60, "workspace_user"),
  ai_generation: policy(10, 60, "workspace_user"),
  project_creation: policy(10, 3600, "workspace_user"),
  manual_company_creation: policy(30, 60, "workspace_user"),
  company_saving: policy(60, 60, "workspace_user"),
  outreach_handoff: policy(30, 60, "workspace_user"),
  sensitive_export: policy(5, 3600, "workspace_user"),
  billing_checkout: policy(5, 300, "workspace_user"),
  billing_portal: policy(10, 300, "workspace_user"),
  billing_webhook: policy(120, 60, "ip"),
  billing_plan_change: policy(5, 300, "workspace_user"),
  decision_role_generation: policy(10, 60, "workspace_user"),
  campaign_creation: policy(10, 3600, "workspace_user"),
  message_scheduling: policy(60, 60, "workspace_user"),
  mailbox_send: policy(30, 60, "workspace_user"),
};

export function getRateLimitPolicy(operation: string): RateLimitPolicy {
  return RATE_LIMIT_POLICIES[operation as RateLimitOperation] ?? policy(60, 60, "workspace_user");
}
