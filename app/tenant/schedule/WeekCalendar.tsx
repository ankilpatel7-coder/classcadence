"use client";

import { useState } from "react";
import Link from "next/link";
import { formatTimeInTimezone } from "@/lib/time";
import { CountBadge } from "@/app/_components/CountBadge";

export type ScheduleSession = {
  id: string;
  startUtc: string;
  endUtc: string;
  tz: string;
  classroomName: string;
  classroomColor: string;
  locationName: string;
  expectedCount: number;
  studentNames: string[];
  dayKey: string; // YYYY-MM-DD in the location tz
};

export type DayColumn = {
  dayKey: string; // YYYY-MM-DD
  label: string; // "Mon"
  dateLabel: string; // "May 22"
  isToday: boolean;
};

const ROW_PX = 40;
const HEADER_PX = 6;

function minutesIntoDay(utc: string, tz: string): number {
  const t = formatTimeInTimezone(utc, tz);
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function WeekCalendar({
  days,
  sessions,
  axisStartMin,
  axisEndMin,
}: {
  days: DayColumn[];
  sessions: ScheduleSession[];
  axisStartMin: number;
  axisEndMin: number;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const rows: number[] = [];
  for (let t = axisStartMin; t < axisEndMin; t += 30) rows.push(t);
  const gridHeight = rows.length * ROW_PX;

  return (
    <div className="rounded-lg border border-line bg-surface shadow-card">
      {/* Header row with day labels */}
      <div
        className="grid border-b border-line"
        style={{ gridTemplateColumns: `72px repeat(${days.length}, 1fr)` }}
      >
        <div className="bg-bg/60" />
        {days.map((d) => (
          <div
            key={d.dayKey}
            className={`border-l border-line px-3 py-2 text-center ${
              d.isToday ? "bg-primary-soft/40" : "bg-bg/60"
            }`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${
                d.isToday ? "text-primary-strong" : "text-muted"
              }`}
            >
              {d.label}
            </p>
            <p
              className={`mt-0.5 text-sm font-medium tabular-nums ${
                d.isToday ? "text-primary-strong" : "text-ink"
              }`}
            >
              {d.dateLabel}
            </p>
          </div>
        ))}
      </div>

      {/* Body */}
      <div
        className="grid"
        style={{ gridTemplateColumns: `72px repeat(${days.length}, 1fr)` }}
      >
        {/* Time gutter */}
        <div className="relative border-r border-line bg-bg/40" style={{ height: gridHeight }}>
          {rows.map((t, i) => (
            <div
              key={t}
              className={`absolute right-2 -translate-y-1/2 text-[10px] tabular-nums ${
                t % 60 === 0 ? "font-medium text-ink" : "text-muted"
              }`}
              style={{ top: i * ROW_PX + HEADER_PX }}
            >
              {t % 60 === 0 ? fmt(t) : ""}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const daySessions = sessions.filter((s) => s.dayKey === day.dayKey);
          return (
            <div
              key={day.dayKey}
              className={`relative border-l border-line ${
                day.isToday ? "bg-primary-soft/10" : ""
              }`}
              style={{ height: gridHeight }}
            >
              {rows.map((t, i) => (
                <div
                  key={t}
                  className={`absolute inset-x-0 ${
                    t % 60 === 0
                      ? "border-t border-line"
                      : "border-t border-dashed border-line/60"
                  }`}
                  style={{ top: i * ROW_PX }}
                />
              ))}

              {daySessions.map((s) => {
                const sMin = minutesIntoDay(s.startUtc, s.tz);
                const eMin = minutesIntoDay(s.endUtc, s.tz);
                const top = ((sMin - axisStartMin) / 30) * ROW_PX + HEADER_PX;
                const height = Math.max(
                  ((eMin - sMin) / 30) * ROW_PX - 4,
                  ROW_PX * 1.2
                );
                const target = day.isToday ? "/tenant/today" : null;
                const inner = (
                  <div
                    className="flex h-full items-center gap-2.5 overflow-hidden rounded-lg border bg-surface px-2.5 py-1.5 shadow-card transition hover:shadow-lift"
                    style={{
                      borderColor: s.classroomColor,
                      borderLeftWidth: 5,
                      opacity: hoveredId && hoveredId !== s.id ? 0.7 : 1,
                    }}
                  >
                    <CountBadge
                      count={s.studentNames.length}
                      color={s.classroomColor}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tabular-nums text-ink">
                        {formatTimeInTimezone(s.startUtc, s.tz)}
                      </p>
                      <p className="truncate text-[11px] text-muted">
                        {s.classroomName}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <div
                    key={s.id}
                    className="absolute inset-x-1.5"
                    style={{ top, height }}
                    onMouseEnter={() => setHoveredId(s.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {target ? <Link href={target}>{inner}</Link> : inner}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmt(t: number) {
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

