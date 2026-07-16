export type OutreachErrorCode =
  | "invalid_request"
  | "unauthenticated"
  | "unauthorized"
  | "project_not_found"
  | "country_not_found"
  | "company_not_found"
  | "decision_role_not_found"
  | "decision_role_not_approved"
  | "product_analysis_missing"
  | "icp_not_approved"
  | "already_running"
  | "provider_unavailable"
  | "provider_timeout"
  | "invalid_provider_response"
  | "configuration_missing"
  | "usage_limit_reached"
  | "persistence_failure";

const SAFE_MESSAGES: Record<OutreachErrorCode, string> = {
  invalid_request: "Check the outreach request and try again.",
  unauthenticated: "Sign in to generate outreach.",
  unauthorized: "No permission.",
  project_not_found: "Project not found.",
  country_not_found: "Target country not found.",
  company_not_found: "Company not found.",
  decision_role_not_found: "Decision role not found.",
  decision_role_not_approved: "An approved decision role is required.",
  product_analysis_missing: "A completed product analysis is required.",
  icp_not_approved: "An approved ICP is required.",
  already_running: "Outreach generation is already in progress for this role and channel.",
  provider_unavailable: "Outreach provider unavailable.",
  provider_timeout: "Generation timed out.",
  invalid_provider_response: "The generated outreach could not be validated.",
  configuration_missing: "Outreach configuration is unavailable.",
  usage_limit_reached: "Usage limit reached for this billing period.",
  persistence_failure: "The outreach draft could not be saved.",
};

export class OutreachError extends Error {
  readonly code: OutreachErrorCode;

  constructor(code: OutreachErrorCode) {
    super(SAFE_MESSAGES[code]);
    this.name = "OutreachError";
    this.code = code;
  }
}

export function safeOutreachError(code: OutreachErrorCode): string {
  return SAFE_MESSAGES[code];
}

export function mapOutreachExecutionError(error: unknown): OutreachErrorCode {
  if (error instanceof OutreachError) return error.code;
  if (error instanceof Error && /timeout|timed out/i.test(error.message)) {
    return "provider_timeout";
  }
  if (error instanceof Error && /provider|configuration/i.test(error.name)) {
    return "configuration_missing";
  }
  return "persistence_failure";
}
