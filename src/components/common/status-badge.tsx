import { Badge, type BadgeProps } from "@/components/ui/badge";

type StatusTone = NonNullable<BadgeProps["tone"]>;

const statusToTone: Record<string, StatusTone> = {
  pending: "neutral",
  running: "info",
  active: "primary",
  sent: "info",
  engaged: "warning",
  qualified: "info",
  won: "success",
  succeeded: "success",
  lost: "danger",
  failed: "danger",
  draft: "neutral",
  generated: "accent",
  archived: "neutral",
  selected: "neutral",
  analyzing: "info",
  analyzed: "primary",
  shortlisted: "accent",
  rejected: "danger",
};

export interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const tone = statusToTone[status.toLowerCase()] ?? "neutral";
  return (
    <Badge tone={tone} variant="outline" className={className}>
      {label ?? status}
    </Badge>
  );
}
