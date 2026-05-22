export default function TodayLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-32 rounded bg-line/60" />
        <div className="mt-2 h-4 w-72 rounded bg-line/40" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-lg border border-line bg-surface shadow-card"
          />
        ))}
      </div>
      <div className="panel space-y-2 p-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-md border border-line bg-surface p-3"
          >
            <div className="h-8 w-8 rounded-full bg-line/60" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 rounded bg-line/60" />
              <div className="h-2.5 w-24 rounded bg-line/40" />
            </div>
            <div className="h-8 w-20 rounded-md bg-line/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
