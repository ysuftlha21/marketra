import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Skeleton className="h-20" />
      <Skeleton className="h-64" />
    </div>
  );
}
