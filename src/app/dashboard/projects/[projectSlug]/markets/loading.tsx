import { Skeleton } from "@/components/ui/skeleton";

export default function MarketsLoading() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-7 pb-10"
      aria-busy="true"
      aria-label="Loading markets"
    >
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-[36rem] max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="aspect-[2.5/1] max-h-96 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-96 rounded-lg" />
        ))}
      </div>
      <span className="sr-only">Loading market intelligence workspaces</span>
    </div>
  );
}
