"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function BillingSettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Next.js records the digest server-side; do not expose the raw error to users.
    void error.digest;
  }, [error]);

  return (
    <div className="mx-auto max-w-xl rounded-lg border border-border p-6 text-center">
      <h2 className="text-lg font-semibold">Billing information is temporarily unavailable</h2>
      <p className="mt-2 text-sm text-muted-foreground">Please try again in a moment.</p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
