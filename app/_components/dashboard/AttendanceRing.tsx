// Pure-SVG attendance ratio ring. Percentage sits in the SVG center
// via absolute positioning over a square aspect-ratio wrapper — no
// negative margins, no fragile percentage math.

export function AttendanceRing({
  percent,
  size = 180,
  stroke = 14,
  label,
  caption,
}: {
  percent: number; // 0-100
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - safe / 100);
  const id = `ringGrad-${safe}`;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        role="img"
        aria-label={`${safe}% attendance`}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2BC98A" />
            <stop offset="60%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-primary-strong)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeOpacity="0.45"
          strokeWidth={stroke}
        />
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
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 0.61, 0.36, 1)" }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <p className="text-[44px] font-bold leading-none tabular-nums text-ink">
          {safe}
          <span className="text-2xl font-semibold text-muted">%</span>
        </p>
        {label ? (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {label}
          </p>
        ) : null}
        {caption ? (
          <p className="mt-0.5 text-[11px] tabular-nums text-muted">{caption}</p>
        ) : null}
      </div>
    </div>
  );
}
