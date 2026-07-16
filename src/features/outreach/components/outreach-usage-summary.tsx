"use client";

interface OutreachUsageSummaryProps {
  used: number;
  limit: number;
  remaining: number;
}

export function OutreachUsageSummary({ used, limit, remaining }: OutreachUsageSummaryProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">
        Outreach: <span className="font-medium text-foreground tabular-nums">{used}</span>
        <span className="text-muted-foreground"> / {limit}</span>
      </span>
      {remaining <= 0 ? (
        <span className="text-xs text-danger">Limit reached</span>
      ) : remaining <= 3 ? (
        <span className="text-xs text-warning">{remaining} remaining</span>
      ) : null}
    </div>
  );
}
