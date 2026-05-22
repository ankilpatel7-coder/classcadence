"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCheck } from "lucide-react";
import { formatTimeInTimezone } from "@/lib/time";
import { AttendanceRowActions } from "./AttendanceRowActions";
import { checkInAllExpectedAction } from "./actions";

export type AttendanceRow = {
  id: string;
  status: string;
  check_in_at: string | null;
  check_out_at: string | null;
  student: { id: string; first_name: string; last_name: string };
};

export type CalendarSession = {
  id: string;
  startUtc: string;
  endUtc: string;
  tz: string;
  classroomName: string;
  classroomColor: string;
  locationName: string;
  records: AttendanceRow[];
};

const STATUS_BADGE: Record<string, string> = {
  expected: "bg-line text-muted",
  present: "bg-success-soft text-success",
  late: "bg-warning/10 text-warning",
  absent: "bg-danger/10 text-danger",
  excused: "bg-bg text-muted",
  made_up: "bg-primary-soft text-primary-strong",
};

const ROW_PX = 32; // height per 30-min row in the calendar grid
const HEADER_PX = 8;

function minutesIntoDay(utc: string, tz: string): number {
  const t = formatTimeInTimezone(utc, tz); // "HH:MM"
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function TodayCalendar({
  sessions,
  axisStartMin,
  axisEndMin,
}: {
  sessions: CalendarSession[];
  axisStartMin: number;
  axisEndMin: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (sessions.length === 0) return null;

  const rows: number[] = [];
  for (let t = axisStartMin; t < axisEndMin; t += 30) rows.push(t);
  const gridHeight = rows.length * ROW_PX;

  return (
    <div className="rounded-lg border border-line bg-surface shadow-card">
      <div className="grid" style={{ gridTemplateColumns: "72px 1fr" }}>
        {/* Time gutter */}
        <div className="relative border-r border-line bg-bg/50" style={{ height: gridHeight }}>
          {rows.map((t, i) => (
            <div
              key={t}
              className={`absolute right-2 -translate-y-1/2 text-[10px] tabular-nums ${
                t % 60 === 0 ? "text-ink font-medium" : "text-muted"
              }`}
              style={{ top: i * ROW_PX + HEADER_PX }}
            >
              {t % 60 === 0 ? fmt(t) : ""}
            </div>
          ))}
        </div>

        {/* Day column with positioned session cards */}
        <div className="relative" style={{ height: gridHeight }}>
          {/* Background grid lines */}
          {rows.map((t, i) => (
            <div
              key={t}
              className={`absolute inset-x-0 ${
                t % 60 === 0 ? "border-t border-line" : "border-t border-dashed border-line/60"
              }`}
              style={{ top: i * ROW_PX }}
            />
          ))}

          {/* Sessions */}
          {sessions.map((s) => {
            const startMin = minutesIntoDay(s.startUtc, s.tz);
            const endMin = minutesIntoDay(s.endUtc, s.tz);
            const top = ((startMin - axisStartMin) / 30) * ROW_PX + HEADER_PX;
            const height = ((endMin - startMin) / 30) * ROW_PX - 2;
            const expanded = expandedId === s.id;

            const counts = countsByStatus(s.records);

            return (
              <div
                key={s.id}
                className="absolute inset-x-2 overflow-hidden rounded-md border bg-surface shadow-card transition-all"
                style={{
                  top,
                  height: expanded ? "auto" : Math.max(height, 56),
                  zIndex: expanded ? 10 : 1,
                  borderColor: s.classroomColor,
                  borderLeftWidth: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-bg/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold tabular-nums text-ink">
                      {formatTimeInTimezone(s.startUtc, s.tz)}–
                      {formatTimeInTimezone(s.endUtc, s.tz)} ·{" "}
                      <span className="text-muted">{s.classroomName}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted">
                      {s.locationName} · {s.records.length} expected
                    </p>
                  </div>
                  <CountsPill counts={counts} />
                </button>

                {expanded ? (
                  <div className="border-t border-line">
                    {s.records.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-muted">
                        No students enrolled yet.
                      </p>
                    ) : (
                      <>
                        {counts.expected > 0 ? (
                          <div className="flex items-center justify-between gap-2 border-b border-line bg-bg/40 px-3 py-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted">
                              {counts.expected} still to check in
                            </span>
                            <form action={checkInAllExpectedAction}>
                              <input type="hidden" name="session_id" value={s.id} />
                              <BulkCheckInButton />
                            </form>
                          </div>
                        ) : null}
                        <ul className="divide-y divide-line">
                          {s.records.map((r) => (
                          <li
                            key={r.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                          >
                            <div>
                              <p className="text-sm font-medium text-ink">
                                {r.student.first_name} {r.student.last_name}
                              </p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                                <span
                                  className={`rounded-full px-2 py-0.5 font-medium ${
                                    STATUS_BADGE[r.status] ?? "bg-line text-muted"
                                  }`}
                                >
                                  {r.status}
                                </span>
                                {r.check_in_at ? (
                                  <span>
                                    In {formatTimeInTimezone(r.check_in_at, s.tz)}
                                  </span>
                                ) : null}
                                {r.check_out_at ? (
                                  <span>
                                    Out {formatTimeInTimezone(r.check_out_at, s.tz)}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <AttendanceRowActions
                              attendanceId={r.id}
                              status={r.status}
                              checkedIn={!!r.check_in_at}
                              checkedOut={!!r.check_out_at}
                            />
                          </li>
                        ))}
                        </ul>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function fmt(t: number) {
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function countsByStatus(rows: AttendanceRow[]) {
  const c = { present: 0, absent: 0, excused: 0, expected: 0, other: 0 };
  for (const r of rows) {
    if (r.status === "present" || r.status === "late") c.present++;
    else if (r.status === "absent") c.absent++;
    else if (r.status === "excused") c.excused++;
    else if (r.status === "expected") c.expected++;
    else c.other++;
  }
  return c;
}

function BulkCheckInButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md bg-success px-2.5 py-1 text-[11px] font-medium text-white shadow-emboss transition hover:brightness-110 disabled:opacity-60"
    >
      <CheckCheck className="h-3.5 w-3.5" />
      {pending ? "Checking in…" : "Check in all expected"}
    </button>
  );
}

function CountsPill({
  counts,
}: {
  counts: { present: number; absent: number; excused: number; expected: number };
}) {
  const items: { label: string; count: number; cls: string }[] = [];
  if (counts.present) items.push({ label: "P", count: counts.present, cls: "bg-success-soft text-success" });
  if (counts.absent) items.push({ label: "A", count: counts.absent, cls: "bg-danger/10 text-danger" });
  if (counts.excused) items.push({ label: "E", count: counts.excused, cls: "bg-line text-muted" });
  if (counts.expected) items.push({ label: "—", count: counts.expected, cls: "bg-bg text-muted" });
  return (
    <div className="flex shrink-0 items-center gap-1">
      {items.map((i) => (
        <span
          key={i.label}
          className={`inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${i.cls}`}
        >
          {i.count} {i.label}
        </span>
      ))}
    </div>
  );
}
