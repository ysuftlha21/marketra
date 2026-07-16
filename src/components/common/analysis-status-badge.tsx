import type { AnalysisRunStatus } from "@/features/projects/domain/analysis-status";
import { Badge, type BadgeProps } from "@/components/ui/badge";

type StatusTone = NonNullable<BadgeProps["tone"]>;

const analysisStatusMap: Record<AnalysisRunStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "Pending", tone: "neutral" },
  running: { label: "Running", tone: "info" },
  succeeded: { label: "Succeeded", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

export interface AnalysisStatusBadgeProps {
  status: AnalysisRunStatus;
  className?: string;
}

export function AnalysisStatusBadge({ status, className }: AnalysisStatusBadgeProps) {
  const { label, tone } = analysisStatusMap[status];
  return (
    <Badge tone={tone} variant="outline" className={className}>
      {label}
    </Badge>
  );
}
