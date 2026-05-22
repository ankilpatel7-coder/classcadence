export default function ScheduleLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="h-7 w-32 rounded bg-line/60" />
          <div className="mt-2 h-4 w-80 rounded bg-line/40" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-md bg-line/40" />
          <div className="h-8 w-16 rounded-md bg-line/40" />
          <div className="h-8 w-16 rounded-md bg-line/40" />
        </div>
      </div>
      <div className="rounded-lg border border-line bg-surface p-3 shadow-card">
        <div className="h-[480px] rounded-md bg-line/20" />
      </div>
    </div>
  );
}
