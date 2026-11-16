export default function FarmDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-pulse space-y-8">
      {/* Title & badge */}
      <div className="space-y-3">
        <div className="h-6 w-32 rounded-full bg-line/60" />
        <div className="h-10 w-96 rounded-xl bg-line/70" />
        <div className="h-5 w-64 rounded bg-line/40" />
      </div>

      {/* Gallery skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[380px]">
        <div className="md:col-span-2 h-full rounded-2xl bg-line/60" />
        <div className="grid grid-rows-2 gap-4 h-full">
          <div className="rounded-2xl bg-line/50" />
          <div className="rounded-2xl bg-line/50" />
        </div>
      </div>

      {/* Content + booking card columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-40 rounded-2xl bg-surface border border-line p-6 space-y-3">
            <div className="h-6 w-48 rounded bg-line/60" />
            <div className="h-4 w-full rounded bg-line/40" />
            <div className="h-4 w-5/6 rounded bg-line/40" />
          </div>
        </div>
        <div>
          <div className="h-80 rounded-2xl bg-surface border border-line p-6" />
        </div>
      </div>
    </div>
  );
}

