// Pure-SVG attendance ratio ring. No deps. Brand-colored gradient.
// Renders a 200x200 ring with the percentage in the middle.

export function AttendanceRing({
  percent,
  size = 200,
  stroke = 16,
  label = "Last 7 days",
}: {
  percent: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - safe / 100);
  const id = `ringGrad-${safe}`;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${label}: ${safe}% attendance`}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2BC98A" />
            <stop offset="60%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-primary-strong)" />
          </linearGradient>
        </defs>
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeOpacity="0.6"
          strokeWidth={stroke}
        />
        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <div className="-mt-[60%] flex flex-col items-center">
        <p className="text-4xl font-bold tabular-nums text-ink">{safe}%</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {label}
        </p>
      </div>
    </div>
  );
}
