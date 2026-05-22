// Big circular count badge in the classroom's color. Shared by Today + Schedule
// so the headcount-per-class glance is consistent across pages.

export function CountBadge({
  count,
  color,
  size = 36,
}: {
  count: number;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white shadow-emboss ring-2 ring-surface tabular-nums"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        backgroundColor: color,
        backgroundImage: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.32), transparent 55%)`,
      }}
      title={`${count} student${count === 1 ? "" : "s"}`}
      aria-label={`${count} students enrolled`}
    >
      {count}
    </span>
  );
}
