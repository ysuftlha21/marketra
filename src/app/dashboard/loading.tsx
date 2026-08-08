export default function DashboardLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading dashboard"
      role="status"
      className="animate-pulse space-y-4 motion-reduce:animate-none"
    >
      <span className="sr-only">Loading dashboard data…</span>
      <div className="space-y-2 py-2">
        <div className="h-4 w-24 rounded bg-white/[.05]" />
        <div className="h-7 w-64 max-w-full rounded bg-white/[.05]" />
        <div className="h-4 w-80 max-w-full rounded bg-white/[.035]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="marketra-panel h-28 bg-white/[.025] p-4">
            <div className="h-8 w-8 rounded-lg bg-white/[.05]" />
            <div className="mt-3 h-4 w-24 rounded bg-white/[.04]" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-[2.37fr_1fr]">
        <div className="marketra-panel h-[529px] bg-white/[.025]" />
        <div className="space-y-3">
          <div className="marketra-panel h-[338px] bg-white/[.025]" />
          <div className="marketra-panel h-[179px] bg-white/[.025]" />
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="marketra-panel h-[272px] bg-white/[.025]" />
        ))}
      </div>
    </div>
  );
}
