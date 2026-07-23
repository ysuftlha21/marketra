export type SignupMode = "open" | "invite_only" | "allowlist" | "disabled";

export function normalizeSignupAllowlist(raw: string): readonly string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function canCreateAccount(input: {
  mode: SignupMode;
  email: string;
  allowlist: readonly string[];
}): boolean {
  if (input.mode === "open") return true;
  if (input.mode === "disabled") return false;
  const email = input.email.trim().toLowerCase();
  const domain = email.slice(email.lastIndexOf("@"));
  return input.allowlist.includes(email) || input.allowlist.includes(domain);
}

export const CLOSED_BETA_MESSAGE =
  "New account registration is currently limited. Please contact Marketra support for access.";
