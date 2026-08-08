"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="marketra-panel mx-auto mt-16 max-w-lg p-8 text-center"
      role="alert"
      aria-live="assertive"
    >
      <h1 className="text-lg font-semibold">We couldn’t load your dashboard.</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Please try again. Your workspace data has not been changed.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 min-h-10 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        Try again
      </button>
    </div>
  );
}
