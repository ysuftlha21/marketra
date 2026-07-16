export default function DashboardLoading() {
  return (
    <div aria-label="Loading dashboard" className="animate-pulse space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="marketra-panel h-24 bg-white/[.025]" />
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
