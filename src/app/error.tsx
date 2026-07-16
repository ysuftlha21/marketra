"use client";

import * as React from "react";
import { ErrorState } from "@/components/common/error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased">
      <main className="flex min-h-screen items-center justify-center px-6">
        <ErrorState
          title="Something went wrong"
          description="An unexpected error occurred while loading this page."
          retry={reset}
        />
      </main>
    </div>
  );
}
