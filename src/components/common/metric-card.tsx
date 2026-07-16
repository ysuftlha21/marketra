import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const metricCardVariants = cva("rounded-lg border px-4 py-4 shadow-sm", {
  variants: {
    tone: {
      neutral: "border-border bg-surface",
      primary: "border-primary/20 bg-primary/5",
      success: "border-success/20 bg-success/5",
      warning: "border-warning/20 bg-warning/5",
      danger: "border-danger/20 bg-danger/5",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface MetricCardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof metricCardVariants> {
  label: string;
  value: React.ReactNode;
  hint?: string;
  delta?: { value: string; trend: "up" | "down" | "flat" };
}

export function MetricCard({
  label,
  value,
  hint,
  delta,
  tone,
  className,
  ...props
}: MetricCardProps) {
  return (
    <div className={cn(metricCardVariants({ tone }), className)} {...props}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {(hint || delta) && (
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {delta ? (
            <span
              className={cn(
                "font-medium",
                delta.trend === "up" && "text-success",
                delta.trend === "down" && "text-danger",
                delta.trend === "flat" && "text-muted-foreground",
              )}
            >
              {delta.trend === "up" ? "▲" : delta.trend === "down" ? "▼" : "–"} {delta.value}
            </span>
          ) : null}
          {hint ? <span>{hint}</span> : null}
        </div>
      )}
    </div>
  );
}
