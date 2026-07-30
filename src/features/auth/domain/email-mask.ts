export function maskEmail(email: string | null | undefined): string {
  if (!email) return "your email address";
  const separator = email.lastIndexOf("@");
  if (separator <= 0 || separator === email.length - 1) return "your email address";
  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  const visiblePrefix = local.slice(0, Math.min(2, local.length));
  return `${visiblePrefix}${"•".repeat(Math.max(3, local.length - visiblePrefix.length))}@${domain}`;
}
