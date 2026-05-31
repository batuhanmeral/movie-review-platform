// Feed kartları yüklenirken gösterilen iskelet.
// HomePage'deki animate-pulse / bg-surface-muted desenini izler.
export function FeedCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card animate-pulse space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-surface-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-surface-muted" />
              <div className="h-2.5 w-24 rounded bg-surface-muted" />
            </div>
          </div>
          {/* Body */}
          <div className="flex gap-4">
            <div className="h-28 w-[4.5rem] shrink-0 rounded-lg bg-surface-muted sm:h-32 sm:w-20" />
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-2/3 rounded bg-surface-muted" />
              <div className="h-3 w-24 rounded bg-surface-muted" />
              <div className="h-3 w-full rounded bg-surface-muted" />
              <div className="h-3 w-5/6 rounded bg-surface-muted" />
            </div>
          </div>
          {/* Footer */}
          <div className="flex gap-3 border-t border-white/5 pt-3">
            <div className="h-6 w-14 rounded bg-surface-muted" />
            <div className="h-6 w-14 rounded bg-surface-muted" />
            <div className="h-6 w-10 rounded bg-surface-muted" />
          </div>
        </div>
      ))}
    </>
  );
}
