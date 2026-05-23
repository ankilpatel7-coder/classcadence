// Pure-SVG vertical bar chart for weekly attendance %. Rounded tops,
// dashed grid, soft hover (CSS-only), gradient fill.

export type WeekBar = {
  label: string;       // "May 12"
  ratio: number;       // 0-100
  present: number;
  absent: number;
};

export function WeeklyBars({
  weeks,
  height = 200,
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

  // Use a unitless viewBox sized to the count so the chart breathes
  // at any container width. Bar widths are percentages.
  const padLeft = 32;
  const padRight = 14;
  const padTop = 18;
  const labelHeight = 30;
  const innerH = height - padTop - labelHeight;

  const slotWidth = 92; // arbitrary unit per week — the SVG scales
  const barWidth = 38;
  const innerW = weeks.length * slotWidth;
  const totalW = innerW + padLeft + padRight;

  const ticks = [0, 50, 100];

  return (
    <svg
      viewBox={`0 0 ${totalW} ${height}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Weekly attendance ratio"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="weeklyBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2BC98A" />
          <stop offset="55%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-primary-strong)" />
        </linearGradient>
      </defs>

      {/* Grid lines + Y-axis ticks */}
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
              strokeOpacity={t === 0 ? 0.5 : 0.18}
              strokeDasharray={t === 0 ? "" : "2 4"}
            />
            <text
              x={padLeft - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fontFamily="ui-monospace,Menlo,monospace"
              fill="var(--color-text-soft)"
              opacity="0.7"
            >
              {t}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {weeks.map((w, i) => {
        const slotX = padLeft + i * slotWidth + (slotWidth - barWidth) / 2;
        const ratio = Math.max(0, Math.min(100, w.ratio));
        const h = (ratio / 100) * innerH;
        const y = padTop + innerH - h;
        const isEmpty = w.present + w.absent === 0;
        const isLast = i === weeks.length - 1;
        return (
          <g key={i} className="weekly-bar-group">
            <title>
              {`${w.label}: ${ratio}%  (${w.present} present, ${w.absent} absent)`}
            </title>
            {/* track silhouette */}
            <rect
              x={slotX}
              y={padTop}
              width={barWidth}
              height={innerH}
              fill="var(--color-bg)"
              fillOpacity={0.4}
              rx={7}
            />
            {!isEmpty ? (
              <rect
                x={slotX}
                y={y}
                width={barWidth}
                height={Math.max(h, 4)}
                fill="url(#weeklyBarGrad)"
                rx={7}
                style={{
                  filter: isLast
                    ? "drop-shadow(0 2px 6px rgba(11,104,69,0.25))"
                    : undefined,
                }}
              />
            ) : null}
            {/* value label above bar */}
            {!isEmpty ? (
              <text
                x={slotX + barWidth / 2}
                y={Math.max(y - 6, padTop + 10)}
                textAnchor="middle"
                fontSize="11"
                fontWeight={700}
                fill={isLast ? "var(--color-primary-strong)" : "var(--color-text)"}
              >
                {ratio}%
              </text>
            ) : (
              <text
                x={slotX + barWidth / 2}
                y={padTop + innerH - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--color-text-soft)"
                opacity="0.6"
              >
                —
              </text>
            )}
            {/* x-axis label — "current" week gets a stronger color */}
            <text
              x={slotX + barWidth / 2}
              y={padTop + innerH + 18}
              textAnchor="middle"
              fontSize="10"
              fontWeight={isLast ? 600 : 400}
              fill={isLast ? "var(--color-text)" : "var(--color-text-soft)"}
            >
              {w.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
