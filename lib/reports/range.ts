// Shared date-range resolution for the dashboard + reports. Translates a
// `range` query param (with optional from/to for custom) into concrete UTC
// start/end Dates plus a human label. Ranges are computed in UTC; that's good
// enough for reporting windows (a few hours of TZ skew at the boundary is fine).

export type RangeKey = "7d" | "30d" | "90d" | "ytd" | "custom";

const DAY_MS = 24 * 60 * 60 * 1000;
const VALID: RangeKey[] = ["7d", "30d", "90d", "ytd", "custom"];

export type ResolvedRange = {
  key: RangeKey;
  start: Date;
  end: Date;
  label: string;
  from?: string; // YYYY-MM-DD, only for custom
  to?: string;
};

function isYmd(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function resolveRange(params: {
  range?: string;
  from?: string;
  to?: string;
}): ResolvedRange {
  const now = new Date();
  const key: RangeKey = VALID.includes(params.range as RangeKey)
    ? (params.range as RangeKey)
    : "7d";

  if (key === "custom" && isYmd(params.from) && isYmd(params.to)) {
    const start = new Date(`${params.from}T00:00:00.000Z`);
    const end = new Date(`${params.to}T23:59:59.999Z`);
    if (start <= end) {
      return {
        key,
        start,
        end,
        from: params.from,
        to: params.to,
        label: `${params.from} → ${params.to}`,
      };
    }
  }

  switch (key) {
    case "30d":
      return { key, start: new Date(now.getTime() - 30 * DAY_MS), end: now, label: "Last 30 days" };
    case "90d":
      return { key, start: new Date(now.getTime() - 90 * DAY_MS), end: now, label: "Last 90 days" };
    case "ytd":
      return {
        key,
        start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
        end: now,
        label: "Year to date",
      };
    case "7d":
    case "custom": // custom without valid dates falls back to 7d
    default:
      return { key: "7d", start: new Date(now.getTime() - 7 * DAY_MS), end: now, label: "Last 7 days" };
  }
}
