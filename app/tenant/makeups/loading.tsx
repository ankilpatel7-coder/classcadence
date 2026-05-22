export default function MakeupsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-32 rounded bg-line/60" />
        <div className="mt-2 h-4 w-72 rounded bg-line/40" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="panel">
          <div className="border-b border-line bg-bg/40 px-4 py-2">
            <div className="h-3 w-32 rounded bg-line/60" />
          </div>
          <div className="space-y-2 p-3">
            {[0, 1].map((j) => (
              <div
                key={j}
                className="flex items-center gap-3 rounded-md border border-line bg-surface p-3"
              >
                <div className="h-8 w-8 rounded-full bg-line/60" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-line/60" />
                  <div className="h-2.5 w-48 rounded bg-line/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
