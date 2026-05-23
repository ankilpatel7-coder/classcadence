// Pure-SVG vertical bar chart. Renders the last N weeks of attendance
// ratio as bars on a single axis with the week label below. Gradient
// fill matches the brand, hover reveals the underlying counts via
// title attribute.

export type WeekBar = {
  label: string;       // "May 12"
  ratio: number;       // 0-100
  present: number;
  absent: number;
};

export function WeeklyBars({
  weeks,
  height = 180,
}: {
  weeks: WeekBar[];
  height?: number;
}) {
  if (weeks.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-md border border-dashed border-line bg-bg/30 text-center text-xs text-muted">
        No attendance recorded yet.
      </div>
    );
  }

  const barWidth = 40;
  const gap = 18;
  const padLeft = 30;
  const padRight = 12;
  const padTop = 16;
  const labelHeight = 28;
  const innerH = height - padTop - labelHeight;
  const innerW = weeks.length * barWidth + (weeks.length - 1) * gap;
  const totalW = innerW + padLeft + padRight;

  // Y-axis ticks at 0, 50, 100 (since values are 0-100).
  const ticks = [0, 50, 100];

  return (
    <svg
      viewBox={`0 0 ${totalW} ${height}`}
      width="100%"
      role="img"
      aria-label="Weekly attendance ratio"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="weeklyBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2BC98A" />
          <stop offset="60%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-primary-strong)" />
        </linearGradient>
      </defs>

      {/* Y-axis ticks + grid lines */}
      {ticks.map((t) => {
        const y = padTop + innerH - (t / 100) * innerH;
        return (
          <g key={t}>
            <line
              x1={padLeft}
              x2={totalW - padRight}
              y1={y}
              y2={y}
              stroke="var(--color-border)"
              strokeOpacity={t === 0 ? 0.5 : 0.25}
              strokeDasharray={t === 0 ? "" : "3 3"}
            />
            <text
              x={padLeft - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fontFamily="ui-monospace,Menlo,monospace"
              fill="var(--color-text-soft)"
            >
              {t}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {weeks.map((w, i) => {
        const x = padLeft + i * (barWidth + gap);
        const ratio = Math.max(0, Math.min(100, w.ratio));
        const h = (ratio / 100) * innerH;
        const y = padTop + innerH - h;
        const isEmpty = w.present + w.absent === 0;
        return (
          <g key={i}>
            <title>
              {`${w.label}: ${ratio}%  (${w.present} present, ${w.absent} absent)`}
            </title>
            {/* faint full-height background per bar — gives a visual anchor when h is small */}
            <rect
              x={x}
              y={padTop}
              width={barWidth}
              height={innerH}
              fill="var(--color-bg)"
              fillOpacity={0.5}
              rx={6}
            />
            {!isEmpty ? (
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(h, 2)}
                fill="url(#weeklyBarGrad)"
                rx={6}
              />
            ) : null}
            {/* value label on top of bar */}
            {!isEmpty ? (
              <text
                x={x + barWidth / 2}
                y={Math.max(y - 4, padTop + 8)}
                textAnchor="middle"
                fontSize="10"
                fontWeight={600}
                fill="var(--color-text)"
              >
                {ratio}%
              </text>
            ) : (
              <text
                x={x + barWidth / 2}
                y={padTop + innerH - 6}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-text-soft)"
              >
                —
              </text>
            )}
            {/* x-axis label */}
            <text
              x={x + barWidth / 2}
              y={padTop + innerH + 16}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-text-soft)"
            >
              {w.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
