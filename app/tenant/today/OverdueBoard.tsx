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

export type OverdueEntry = { row: TodayRow; state: RowState; overBy: number };

// Ticks once a second so the "over by" counter reads live. Membership of the
// board is decided by the parent's coarser tick — this is display only.
function OverBy({ since, lengthMs }: { since: string; lengthMs: number }) {
  const [over, setOver] = useState(() =>
    Math.max(0, Date.now() - new Date(since).getTime() - lengthMs)
  );

  useEffect(() => {
    const id = setInterval(
      () =>
        setOver(Math.max(0, Date.now() - new Date(since).getTime() - lengthMs)),
      1000
    );
    return () => clearInterval(id);
  }, [since, lengthMs]);

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full bg-danger px-3 py-1 font-mono text-base font-bold tabular-nums text-white shadow-emboss ring-2 ring-surface"
      title="Time past this student's session length"
    >
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white/90" />
      +{formatDuration(over)}
    </span>
  );
}

// Pinned board above the schedule: every student whose checked-in time has
// passed their session's length, most overdue first. Rows here are lifted out
// of the table below so a student never appears twice.
export function OverdueBoard({
  entries,
  dispatch,
}: {
  entries: OverdueEntry[];
  dispatch: (attendanceId: string, action: Action) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section
      aria-label="Students past their session time"
      className="overflow-hidden rounded-xl border-2 border-danger/45 bg-danger/5 shadow-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-danger/25 bg-danger/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <AlarmClock className="h-4 w-4 animate-pulse text-danger" />
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-danger">
            Time&apos;s up
          </h2>
        </div>
        <p className="text-xs font-semibold text-danger/80">
          {entries.length} {entries.length === 1 ? "student" : "students"} ready
          for pickup
        </p>
      </header>

      <ul className="divide-y divide-danger/20">
        {entries.map(({ row, state, overBy }) => {
          const studentName = `${row.firstName} ${row.lastName}`.trim();
          return (
            <li
              key={row.attendanceId}
              className="flex flex-col gap-3 bg-danger/[0.06] px-4 py-3 transition hover:bg-danger/10 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <StudentAvatar name={studentName} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-danger">
                    {studentName}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-danger/75">
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
                <OverBy
                  since={state.checkInAt!}
                  lengthMs={sessionLengthMs(row)}
                />
                <ActionButtons
                  state={state}
                  dispatch={(a) => dispatch(row.attendanceId, a)}
                  attendanceId={row.attendanceId}
                  studentName={studentName}
                  onAfterAbsentOrExcuse={() => {}}
                  emphasizeNotify
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
