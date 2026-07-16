import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";

export interface LoadingStateProps {
  title?: string;
  description?: string;
  rows?: number;
  className?: string;
}

export function LoadingState({
  title = "Loading",
  description,
  rows = 3,
  className,
}: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Skeleton className="h-5 w-40" />
        {description ? <Skeleton className="h-4 w-64" /> : null}
      </div>
      <span className="sr-only">{title}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
