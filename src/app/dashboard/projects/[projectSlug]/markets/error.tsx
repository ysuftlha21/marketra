"use client";

import { ErrorState } from "@/components/common/error-state";

export default function MarketsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-7xl py-12">
      <ErrorState
        title="Market intelligence is temporarily unavailable"
        description="Your saved market data is safe. Try loading this workspace again."
        retry={reset}
      />
    </div>
  );
}
