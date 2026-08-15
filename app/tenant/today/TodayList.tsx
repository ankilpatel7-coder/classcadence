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
import { DueBoard, type DueEntry } from "./DueBoard";
import { DUE_SOON_MS, msUntilDue, type TodayRow } from "./types";

// Board membership only needs coarse resolution (a 5-minute threshold); the
// per-student counters do their own 1s tick, so re-rendering the whole list
// every second would be waste.
const TICK_MS = 5_000;

export function TodayList({ rows }: { rows: TodayRow[] }) {
  // Attendance state is lifted here (rather than per-row) so the pinned board
  // and the table below read the same source — checking a student out has to
  // drop them off the board immediately.
  const [states, setStates] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      rows.map((r) => [
        r.attendanceId,
        { status: r.status, checkInAt: r.checkInAt, checkOutAt: r.checkOutAt },
      ])
    )
  );

  // Starts at 0 so the first client render matches the server's (where the
  // board is empty); the effect starts the clock after hydration.
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

  // Students who are checked in, not checked out, and are within five minutes
  // of their session length — or already past it. Sorted by time remaining
  // ascending, so the most overdue is on top, then whoever is closest to their
  // own check-out time, and so on down.
  const due: DueEntry[] = useMemo(() => {
    const out: DueEntry[] = [];
    for (const row of rows) {
      const state = states[row.attendanceId] ?? {
        status: row.status,
        checkInAt: row.checkInAt,
        checkOutAt: row.checkOutAt,
      };
      const remaining = msUntilDue(row, state, now);
      if (remaining === null || remaining > DUE_SOON_MS) continue;
      out.push({ row, state, remaining });
    }
    return out.sort((a, b) => a.remaining - b.remaining);
  }, [rows, states, now]);

  const dueIds = useMemo(
    () => new Set(due.map((e) => e.row.attendanceId)),
    [due]
  );

  // Students on the board are lifted out of the table, so they never show twice.
  const tableRows = useMemo(
    () => rows.filter((r) => !dueIds.has(r.attendanceId)),
    [rows, dueIds]
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
      <DueBoard entries={due} dispatch={dispatch} />

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
