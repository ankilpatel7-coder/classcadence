export default function StudentsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-32 rounded bg-line/60" />
        <div className="mt-2 h-4 w-72 rounded bg-line/40" />
      </div>
      <div className="panel">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0"
          >
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 rounded bg-line/60" />
              <div className="h-2.5 w-64 rounded bg-line/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
