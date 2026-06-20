"use client";

import { useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { formatTimeInTimezone, formatTime12h } from "@/lib/time";

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

const ROW_PX = 48;
const HEADER_PX = 4;

function minutesIntoDay(utc: string, tz: string): number {
  const t = formatTimeInTimezone(utc, tz);
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Strip the day number out of "May 22" so we can render it as the prominent
// numeric date used by most pro calendar UIs.
function splitDateLabel(label: string): { month: string; day: string } {
  const m = /^(\w+)\s+(\d+)$/.exec(label);
  if (!m) return { month: label, day: "" };
  return { month: m[1], day: m[2] };
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

  const gridCols = `64px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      {/* Header row */}
      <div
        className="grid border-b border-line bg-bg/40"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div />
        {days.map((d) => {
          const { month, day } = splitDateLabel(d.dateLabel);
          return (
            <div
              key={d.dayKey}
              className="flex items-center justify-center border-l border-line px-3 py-3"
            >
              <div className="text-center">
                <p
                  className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    d.isToday ? "text-primary" : "text-muted"
                  }`}
                >
                  {d.label}
                </p>
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  {d.isToday ? (
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white shadow-emboss tabular-nums"
                      style={{
                        backgroundImage:
                          "linear-gradient(135deg, #2BC98A 0%, var(--color-primary) 60%, var(--color-primary-strong) 100%)",
                      }}
                    >
                      {day}
                    </span>
                  ) : (
                    <span className="text-base font-semibold text-ink tabular-nums">
                      {day}
                    </span>
                  )}
                  <span className="text-[11px] text-muted">{month}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div
        className="grid"
        style={{ gridTemplateColumns: gridCols }}
      >
        {/* Time gutter */}
        <div className="relative bg-bg/30" style={{ height: gridHeight }}>
          {rows.map((t, i) => (
            <div
              key={t}
              className={`absolute right-2.5 -translate-y-1/2 text-[10px] tabular-nums ${
                t % 60 === 0 ? "font-semibold text-ink" : "text-muted/70"
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
                day.isToday ? "bg-primary-soft/15" : ""
              }`}
              style={{ height: gridHeight }}
            >
              {rows.map((t, i) => (
                <div
                  key={t}
                  className={`absolute inset-x-0 ${
                    t % 60 === 0
                      ? "border-t border-line/80"
                      : "border-t border-dashed border-line/40"
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
                  ROW_PX * 0.9
                );
                const target = day.isToday ? "/tenant/today" : null;
                const fade = hoveredId && hoveredId !== s.id ? 0.6 : 1;

                const inner = (
                  <div
                    className="group relative h-full overflow-hidden rounded-lg bg-surface shadow-card transition hover:-translate-y-px hover:shadow-lift"
                    style={{
                      opacity: fade,
                      backgroundImage: `linear-gradient(180deg, ${s.classroomColor}14 0%, transparent 70%)`,
                      boxShadow:
                        "0 1px 2px rgba(15,23,42,0.05), 0 6px 18px -10px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
                      style={{ backgroundColor: s.classroomColor }}
                    />
                    <div className="flex h-full flex-col justify-between px-2.5 py-1.5 pl-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold tabular-nums leading-tight text-ink">
                          {formatTimeInTimezone(s.startUtc, s.tz)}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-ink/80">
                          {s.classroomName}
                        </p>
                      </div>
                      {s.studentNames.length > 0 ? (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted">
                          <Users className="h-3 w-3" />
                          <span className="tabular-nums">
                            {s.studentNames.length}
                          </span>
                        </div>
                      ) : null}
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
                    {target ? (
                      <Link href={target} className="block h-full">
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
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
  return formatTime12h(
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  );
}
