"use client";

import { useEffect, useState } from "react";
import { AlarmClock } from "lucide-react";
import { StudentAvatar } from "@/app/_components/StudentAvatar";
import {
  ActionButtons,
  formatClockTime,
  type Action,
  type RowState,
} from "./StudentRowClient";
import { formatDuration, sessionLengthMs, type TodayRow } from "./types";

// `remaining` is ms until this student's supposed check-out time — negative
// once they're past it.
export type DueEntry = { row: TodayRow; state: RowState; remaining: number };

// Ticks once a second so the count reads live, and flips from amber
// ("due in") to red ("over by") the moment it crosses zero — without waiting
// for the list's coarser tick.
function DueCountdown({ since, lengthMs }: { since: string; lengthMs: number }) {
  const remainingNow = () => new Date(since).getTime() + lengthMs - Date.now();
  const [remaining, setRemaining] = useState(remainingNow);

  useEffect(() => {
    setRemaining(remainingNow());
    const id = setInterval(() => setRemaining(remainingNow()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [since, lengthMs]);

  const isOver = remaining <= 0;

  return (
    <span
      className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2 font-mono text-3xl font-extrabold tabular-nums leading-none shadow-emboss ring-2 ring-surface ${
        isOver ? "bg-danger text-white" : "bg-warning text-white"
      }`}
      title={
        isOver
          ? "Time past this student's session length"
          : "Time left before this student's session length"
      }
    >
      <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-white/90" />
      {isOver ? "+" : ""}
      {formatDuration(Math.abs(remaining))}
    </span>
  );
}

// Pinned board above the schedule: students who are within five minutes of
// their session length, or already past it. Ordered by how close they are to
// their own check-out time, so the most urgent sits on top. Rows here are
// lifted out of the table below, so a student never appears twice.
export function DueBoard({
  entries,
  dispatch,
}: {
  entries: DueEntry[];
  dispatch: (attendanceId: string, action: Action) => void;
}) {
  if (entries.length === 0) return null;

  const overCount = entries.filter((e) => e.remaining <= 0).length;
  const soonCount = entries.length - overCount;
  // The board reads red as soon as anyone is actually over; amber while
  // everyone is merely approaching.
  const anyOver = overCount > 0;

  return (
    <section
      aria-label="Students due for pickup"
      className={`overflow-hidden rounded-xl border-2 shadow-card ${
        anyOver
          ? "border-danger/45 bg-danger/5"
          : "border-warning/45 bg-warning/5"
      }`}
    >
      <header
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 ${
          anyOver
            ? "border-danger/25 bg-danger/10"
            : "border-warning/25 bg-warning/10"
        }`}
      >
        <div className="flex items-center gap-2">
          <AlarmClock
            className={`h-4 w-4 animate-pulse ${
              anyOver ? "text-danger" : "text-warning"
            }`}
          />
          <h2
            className={`text-sm font-bold uppercase tracking-[0.12em] ${
              anyOver ? "text-danger" : "text-warning"
            }`}
          >
            {anyOver ? "Time's up" : "Due soon"}
          </h2>
        </div>
        <p
          className={`text-xs font-semibold ${
            anyOver ? "text-danger/80" : "text-warning/90"
          }`}
        >
          {overCount > 0 ? `${overCount} over` : null}
          {overCount > 0 && soonCount > 0 ? " · " : null}
          {soonCount > 0 ? `${soonCount} due within 5 min` : null}
        </p>
      </header>

      <ul className={anyOver ? "divide-y divide-danger/20" : "divide-y divide-warning/20"}>
        {entries.map(({ row, state, remaining }) => {
          const studentName = `${row.firstName} ${row.lastName}`.trim();
          const isOver = remaining <= 0;
          return (
            <li
              key={row.attendanceId}
              className={`flex flex-col gap-3 px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
                isOver
                  ? "bg-danger/[0.06] hover:bg-danger/10"
                  : "bg-warning/[0.05] hover:bg-warning/10"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <StudentAvatar name={studentName} size={40} />
                <div className="min-w-0">
                  <p
                    className={`truncate text-lg font-bold ${
                      isOver ? "text-danger" : "text-ink"
                    }`}
                  >
                    {studentName}
                  </p>
                  <p
                    className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs ${
                      isOver ? "text-danger/75" : "text-muted"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: row.classroomColor }}
                      />
                      {row.classroomName}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums">
                      {row.startLocal}–{row.endLocal}
                    </span>
                    {state.checkInAt ? (
                      <>
                        <span>·</span>
                        <span className="tabular-nums">
                          In {formatClockTime(state.checkInAt)}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <DueCountdown
                  since={state.checkInAt!}
                  lengthMs={sessionLengthMs(row)}
                />
                <ActionButtons
                  state={state}
                  dispatch={(a) => dispatch(row.attendanceId, a)}
                  attendanceId={row.attendanceId}
                  studentName={studentName}
                  onAfterAbsentOrExcuse={() => {}}
                  emphasizeNotify={isOver}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
