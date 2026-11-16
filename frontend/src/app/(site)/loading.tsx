export default function SiteLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 animate-pulse">
      {/* Header bar skeleton */}
      <div className="h-8 w-64 rounded-lg bg-line/60 mb-4" />
      <div className="h-4 w-96 rounded bg-line/40 mb-10" />

      {/* Grid skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-5 space-y-4">
            <div className="h-48 w-full rounded-xl bg-line/50" />
            <div className="h-5 w-3/4 rounded bg-line/60" />
            <div className="h-4 w-1/2 rounded bg-line/40" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-6 w-20 rounded bg-line/50" />
              <div className="h-8 w-24 rounded-lg bg-line/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

