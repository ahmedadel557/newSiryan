export function DashboardSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-page)]">
      <aside className="w-[248px] shrink-0 bg-[var(--forest-900)] flex flex-col gap-3 p-4">
        <div className="h-8 w-24 rounded-md bg-[rgba(255,255,255,0.08)] animate-pulse" />
        <div className="flex flex-col gap-2 mt-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-9 rounded-md bg-[rgba(255,255,255,0.06)] animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </aside>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="h-16 shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-1)] flex items-center px-6 gap-4">
          <div className="h-5 w-40 rounded bg-[var(--bg-sunken)] animate-pulse" />
          <div className="ml-auto h-8 w-8 rounded-full bg-[var(--bg-sunken)] animate-pulse" />
        </div>
        <div className="flex-1 p-7 flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-1)] animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <div className="h-64 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-1)] animate-pulse" />
          <div className="h-48 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-1)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
