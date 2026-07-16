import { LoadingState } from "@/components/common/loading-state";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-6xl px-6 py-10">
      <LoadingState rows={4} />
    </div>
  );
}
