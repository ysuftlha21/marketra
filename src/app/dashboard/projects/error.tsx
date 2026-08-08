"use client";

import { ErrorState } from "@/components/common/error-state";

export default function ProjectsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-7xl py-12">
      <ErrorState
        title="Projects are temporarily unavailable"
        description="Your project data is safe. Try loading the workspace again."
        retry={reset}
      />
    </div>
  );
}
