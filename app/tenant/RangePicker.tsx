"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type RangeKey = "7d" | "30d" | "90d" | "ytd" | "custom";

const PRESETS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "Weekly" },
  { key: "30d", label: "Monthly" },
  { key: "90d", label: "90 days" },
  { key: "ytd", label: "YTD" },
  { key: "custom", label: "Custom" },
];

export function RangePicker({
  current,
  from,
  to,
  basePath = "/tenant",
}: {
  current: RangeKey;
  from?: string;
  to?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCustom, setShowCustom] = useState(current === "custom");
  const [fromDate, setFromDate] = useState(from ?? "");
  const [toDate, setToDate] = useState(to ?? "");

  function apply(next: Partial<{ range: RangeKey; from: string; to: string }>) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.range) params.set("range", next.range);
    if (next.range && next.range !== "custom") {
      params.delete("from");
      params.delete("to");
    }
    if (next.from !== undefined) params.set("from", next.from);
    if (next.to !== undefined) params.set("to", next.to);
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  }

  function selectPreset(key: RangeKey) {
    if (key === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    apply({ range: key });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-md border border-line bg-bg/50 p-1 text-xs">
        {PRESETS.map((p) => {
          const active =
            p.key === "custom" ? showCustom : current === p.key && !showCustom;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => selectPreset(p.key)}
              className={`rounded px-2.5 py-1 font-medium transition ${
                active
                  ? "bg-surface text-ink shadow-card"
                  : "text-muted hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {showCustom ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="form-input !py-1 !text-xs"
            aria-label="From date"
          />
          <span className="text-muted">→</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="form-input !py-1 !text-xs"
            aria-label="To date"
          />
          <button
            type="button"
            disabled={!fromDate || !toDate}
            onClick={() => apply({ range: "custom", from: fromDate, to: toDate })}
            className="btn-secondary !px-2.5 !py-1 !text-xs"
          >
            Apply
          </button>
        </div>
      ) : null}
    </div>
  );
}
