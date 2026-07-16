import type { CompanyDecisionRoleRow } from "@/features/companies/repository/decision-role-repository";

export const OUTREACH_CHANNELS = [
  { value: "email", label: "Email" },
  { value: "linkedin_connection", label: "LinkedIn Connection Request" },
  { value: "linkedin_message", label: "LinkedIn Message" },
  { value: "follow_up", label: "Follow-up" },
] as const;

export const OUTREACH_MESSAGE_TYPES = [
  { value: "initial_contact", label: "Initial Contact" },
  { value: "meeting_request", label: "Meeting Request" },
  { value: "connection_request", label: "Connection Request" },
  { value: "follow_up", label: "Follow-up" },
  { value: "re_engagement", label: "Re-engagement" },
] as const;

export const OUTREACH_TONES = [
  { value: "professional", label: "Professional" },
  { value: "concise", label: "Concise" },
  { value: "consultative", label: "Consultative" },
  { value: "friendly", label: "Friendly" },
  { value: "direct", label: "Direct" },
] as const;

export const OUTREACH_LENGTHS = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
] as const;

export const OUTREACH_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "tr", label: "Turkish" },
] as const;

export const CHANNEL_MESSAGE_TYPE_MAP: Record<string, string[]> = {
  email: ["initial_contact", "meeting_request", "follow_up", "re_engagement"],
  linkedin_connection: ["connection_request"],
  linkedin_message: ["initial_contact", "meeting_request", "re_engagement"],
  follow_up: ["follow_up"],
};

export interface ApprovedRoleOption {
  id: string;
  title: string;
  buyingRole: string;
  priority: string;
  isPrimary: boolean;
  isSecondary: boolean;
  department: string;
  fitScore: number;
}

export function getApprovedRoles(roles: CompanyDecisionRoleRow[]): ApprovedRoleOption[] {
  return roles
    .filter((r) => r.status === "approved")
    .map((r) => ({
      id: r.id,
      title: r.role_title,
      buyingRole: r.buying_role,
      priority: r.priority,
      isPrimary: r.is_primary,
      isSecondary: r.is_secondary,
      department: r.department,
      fitScore: r.fit_score,
    }))
    .sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      if (a.isSecondary && !b.isSecondary) return -1;
      if (!a.isSecondary && b.isSecondary) return 1;
      if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
      return a.id.localeCompare(b.id);
    });
}

export function getDefaultRole(approvedRoles: ApprovedRoleOption[]): ApprovedRoleOption | null {
  if (approvedRoles.length === 0) return null;
  const primary = approvedRoles.find((r) => r.isPrimary);
  if (primary) return primary;
  const secondary = approvedRoles.find((r) => r.isSecondary);
  if (secondary) return secondary;
  return approvedRoles[0] ?? null;
}

export function getValidMessageTypes(channel: string): string[] {
  return CHANNEL_MESSAGE_TYPE_MAP[channel] || [];
}

export function getDefaultMessageType(channel: string): string {
  const valid = getValidMessageTypes(channel);
  return valid[0] || "initial_contact";
}
