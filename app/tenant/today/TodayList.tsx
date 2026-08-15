"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { CheckCheck } from "lucide-react";
import { checkInAllExpectedAction } from "./actions";
import {
  StudentTableRow,
  StudentCard,
  reduce,
  type Action,
  type RowState,
} from "./StudentRowClient";
import { LessonNoteWidget } from "./LessonNoteWidget";
import { OverdueBoard, type OverdueEntry } from "./OverdueBoard";
import { overdueBy, type TodayRow } from "./types";

// The overdue check only needs minute-ish resolution; the per-student "over by"
// counters do their own 1s tick, so re-rendering the whole list every second
// would be waste.
const TICK_MS = 5_000;

export function TodayList({ rows }: { rows: TodayRow[] }) {
  // Attendance state is lifted here (rather than per-row) so the "Time's up"
  // board and the table below read the same source — checking a student out
  // has to drop them off the board immediately.
  const [states, setStates] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      rows.map((r) => [
        r.attendanceId,
        { status: r.status, checkInAt: r.checkInAt, checkOutAt: r.checkOutAt },
      ])
    )
  );

  // Starts at 0 so the first client render matches the server's (where nothing
  // can be overdue yet); the effect starts the clock after hydration.
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const rowsById = useMemo(
    () => new Map(rows.map((r) => [r.attendanceId, r])),
    [rows]
  );

  // Rows added by a background revalidate won't be in `states` yet; fall back to
  // the server's values for them.
  function stateFor(row: TodayRow): RowState {
    return (
      states[row.attendanceId] ?? {
        status: row.status,
        checkInAt: row.checkInAt,
        checkOutAt: row.checkOutAt,
      }
    );
  }

  function dispatch(attendanceId: string, action: Action) {
    const row = rowsById.get(attendanceId);
    if (!row) return;
    const prev = stateFor(row);
    setStates((s) => ({ ...s, [attendanceId]: reduce(prev, action) }));

    fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendance_id: attendanceId, action }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("[attendance] update failed:", res.status, text);
          setStates((s) => ({ ...s, [attendanceId]: prev }));
        }
      })
      .catch((err) => {
        console.error("[attendance] update threw:", err);
        setStates((s) => ({ ...s, [attendanceId]: prev }));
      });
  }

  // Students who are checked in, not checked out, and have now been in for at
  // least their session's scheduled length. Most overdue first.
  const overdue: OverdueEntry[] = useMemo(() => {
    const out: OverdueEntry[] = [];
    for (const row of rows) {
      const state = states[row.attendanceId] ?? {
        status: row.status,
        checkInAt: row.checkInAt,
        checkOutAt: row.checkOutAt,
      };
      const overBy = overdueBy(row, state, now);
      if (overBy !== null) out.push({ row, state, overBy });
    }
    return out.sort((a, b) => b.overBy - a.overBy);
  }, [rows, states, now]);

  const overdueIds = useMemo(
    () => new Set(overdue.map((e) => e.row.attendanceId)),
    [overdue]
  );

  // Overdue students are lifted into the board, so they leave the table.
  const tableRows = useMemo(
    () => rows.filter((r) => !overdueIds.has(r.attendanceId)),
    [rows, overdueIds]
  );

  // Recomputed from live state so "Check in all (n)" stays honest after
  // optimistic check-ins.
  const expectedBySession = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of rows) {
      if (stateFor(r).status === "expected") {
        m[r.sessionId] = (m[r.sessionId] ?? 0) + 1;
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, states]);

  return (
    <div className="space-y-4">
      <OverdueBoard entries={overdue} dispatch={dispatch} />

      {tableRows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {/* Desktop table */}
          <table className="hidden min-w-full divide-y divide-line md:table">
            <thead>
              <tr className="border-b border-line bg-bg/50">
                <Th>Time</Th>
                <Th>Class</Th>
                <Th>Student</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 bg-surface">
              {tableRows.map((r, idx) => {
                const prev = idx > 0 ? tableRows[idx - 1] : null;
                const isNewSession = !prev || prev.sessionId !== r.sessionId;
                return (
                  <Fragment key={r.attendanceId}>
                    {isNewSession ? (
                      <SessionHeaderRow
                        sessionId={r.sessionId}
                        classroomName={r.classroomName}
                        classroomColor={r.classroomColor}
                        startLocal={r.startLocal}
                        endLocal={r.endLocal}
                        sessionExpected={expectedBySession[r.sessionId] ?? 0}
                      />
                    ) : null}
                    <StudentTableRow
                      attendanceId={r.attendanceId}
                      startLocal={r.startLocal}
                      endLocal={r.endLocal}
                      classroomName={r.classroomName}
                      classroomColor={r.classroomColor}
                      firstName={r.firstName}
                      lastName={r.lastName}
                      isMakeup={r.isMakeup}
                      isManual={r.isManual}
                      notes={r.notes}
                      state={stateFor(r)}
                      dispatch={(a) => dispatch(r.attendanceId, a)}
                    />
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Mobile card list */}
          <ul className="divide-y divide-line md:hidden">
            {tableRows.map((r) => (
              <Fragment key={r.attendanceId}>
                <StudentCard
                  attendanceId={r.attendanceId}
                  startLocal={r.startLocal}
                  endLocal={r.endLocal}
                  classroomName={r.classroomName}
                  classroomColor={r.classroomColor}
                  firstName={r.firstName}
                  lastName={r.lastName}
                  isMakeup={r.isMakeup}
                  isManual={r.isManual}
                  notes={r.notes}
                  state={stateFor(r)}
                  dispatch={(a) => dispatch(r.attendanceId, a)}
                />
                <li className="px-3 pb-3">
                  <LessonNoteWidget
                    attendanceId={r.attendanceId}
                    existingNotes={r.notes.map((n) => ({
                      body: n.body,
                      visibility:
                        n.visibility === "parent" ? "parent" : "internal",
                      createdAt: n.createdAt,
                    }))}
                  />
                </li>
              </Fragment>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SessionHeaderRow({
  sessionId,
  classroomName,
  classroomColor,
  startLocal,
  endLocal,
  sessionExpected,
}: {
  sessionId: string;
  classroomName: string;
  classroomColor: string;
  startLocal: string;
  endLocal: string;
  sessionExpected: number;
}) {
  return (
    <tr
      style={{
        backgroundImage: `linear-gradient(90deg, ${classroomColor}1A 0%, ${classroomColor}08 40%, transparent 100%)`,
        borderLeft: `3px solid ${classroomColor}`,
      }}
    >
      <td colSpan={5} className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-surface"
              style={{ backgroundColor: classroomColor }}
            />
            <p className="font-mono text-base font-bold tabular-nums text-ink">
              {startLocal}
              <span className="text-muted">–</span>
              {endLocal}
            </p>
            <span className="text-muted">·</span>
            <p className="text-sm font-semibold text-ink/85">{classroomName}</p>
          </div>
          {sessionExpected > 0 ? (
            <form action={checkInAllExpectedAction}>
              <input type="hidden" name="session_id" value={sessionId} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-success px-3.5 py-1.5 text-xs font-semibold text-white shadow-emboss transition hover:-translate-y-px hover:brightness-110"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Check in all ({sessionExpected})
              </button>
            </form>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.15em] text-muted ${className}`}
    >
      {children}
    </th>
  );
}
