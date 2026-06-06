import { Fragment } from "react";
import { CalendarDays, CheckCheck } from "lucide-react";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { locations as locationsTable, sessions } from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import {
  formatTimeInTimezone,
  localToUtc,
  todayInTimezone,
} from "@/lib/time";
import { checkInAllExpectedAction } from "./actions";
import { loadSessionsInWindow } from "./load-sessions";
import { StudentTableRow, StudentCard } from "./StudentRowClient";
import { LessonNoteWidget } from "./LessonNoteWidget";

export const metadata = { title: "Today — ClassCadence" };
export const dynamic = "force-dynamic";

type AttendanceRow = {
  id: string;
  status: string;
  check_in_at: string | null;
  check_out_at: string | null;
  is_makeup: boolean;
  is_manual: boolean;
  students: { id: string; first_name: string; last_name: string };
  lesson_notes: { body: string; visibility: string; created_at: string }[] | null;
};

type SessionRow = {
  id: string;
  scheduled_start_utc: string;
  scheduled_end_utc: string;
  status: string;
  time_slots: {
    classrooms: {
      name: string;
      color: string;
      locations: { id: string; name: string; iana_timezone: string };
    };
  };
  attendance_records: AttendanceRow[];
};

export default async function TodayPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getCurrentUserOrRedirect();

  // App-level tenant isolation: the owner db connection bypasses RLS, so scope
  // every query by the caller's tenantId.
  const tenantId = user.tenantId!;

  const locations = await db
    .select({
      id: locationsTable.id,
      name: locationsTable.name,
      iana_timezone: locationsTable.ianaTimezone,
    })
    .from(locationsTable)
    .where(
      and(
        eq(locationsTable.tenantId, tenantId),
        eq(locationsTable.status, "active")
      )
    )
    .orderBy(asc(locationsTable.createdAt));

  const primaryLocation = locations[0];
  const primaryTz = primaryLocation?.iana_timezone ?? "UTC";
  const today = todayInTimezone(primaryTz);

  const startUtc = localToUtc(today, "00:00", primaryTz).toISOString();
  const endUtc = localToUtc(today, "23:59", primaryTz).toISOString();

  const sessionRows: SessionRow[] = await loadSessionsInWindow(
    tenantId,
    startUtc,
    endUtc
  );

  // Diagnostic: if rendering empty, check the bare count to distinguish
  // "no data" from "data dropped by join".
  let diagnosticBareCount: number | null = null;
  if (sessionRows.length === 0) {
    const bare = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          gte(sessions.scheduledStartUtc, new Date(startUtc)),
          lte(sessions.scheduledStartUtc, new Date(endUtc))
        )
      );
    diagnosticBareCount = bare.length;
    console.log(
      "[today] empty render — tenantId:",
      user.tenantId,
      "window:",
      startUtc,
      "to",
      endUtc,
      "bareSessions:",
      diagnosticBareCount
    );
  }

  // Build day stats.
  const totals = sessionRows.reduce(
    (acc, s) => {
      for (const r of s.attendance_records ?? []) {
        acc.total++;
        if (r.status === "present" || r.status === "late") acc.checkedIn++;
        else if (r.status === "absent") acc.absent++;
        else if (r.status === "excused") acc.excused++;
        else acc.expected++;
      }
      return acc;
    },
    { total: 0, checkedIn: 0, absent: 0, excused: 0, expected: 0 }
  );

  // Flatten into row data (one row per session × student), sorted by time.
  type FlatRow = {
    attendanceId: string;
    sessionId: string;
    startUtc: string;
    endUtc: string;
    tz: string;
    classroomName: string;
    classroomColor: string;
    locationName: string;
    studentId: string;
    firstName: string;
    lastName: string;
    status: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    isMakeup: boolean;
    isManual: boolean;
    notes: { body: string; visibility: string; created_at: string }[];
  };

  const rows: FlatRow[] = sessionRows
    .flatMap((s) =>
      (s.attendance_records ?? []).map<FlatRow>((r) => ({
        attendanceId: r.id,
        sessionId: s.id,
        startUtc: s.scheduled_start_utc,
        endUtc: s.scheduled_end_utc,
        tz: s.time_slots.classrooms.locations.iana_timezone ?? primaryTz,
        classroomName: s.time_slots.classrooms.name,
        classroomColor: s.time_slots.classrooms.color,
        locationName: s.time_slots.classrooms.locations.name,
        studentId: r.students.id,
        firstName: r.students.first_name,
        lastName: r.students.last_name,
        status: r.status,
        checkInAt: r.check_in_at,
        checkOutAt: r.check_out_at,
        isMakeup: r.is_makeup,
        isManual: r.is_manual,
        notes: r.lesson_notes ?? [],
      }))
    )
    .sort((a, b) => {
      if (a.startUtc !== b.startUtc) return a.startUtc.localeCompare(b.startUtc);
      return `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`
      );
    });

  // Group rows by session for the "check in all" header bar.
  const sessionMeta = new Map<
    string,
    { expected: number; classroomName: string }
  >();
  for (const r of rows) {
    const m = sessionMeta.get(r.sessionId) ?? {
      expected: 0,
      classroomName: r.classroomName,
    };
    if (r.status === "expected") m.expected++;
    sessionMeta.set(r.sessionId, m);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Today</h1>
        <p className="mt-1 text-sm text-muted">
          {new Intl.DateTimeFormat("en-US", {
            timeZone: primaryTz,
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }).format(new Date())}
          {primaryLocation ? ` · ${primaryLocation.name}` : ""}
        </p>
      </div>

      {sessionRows.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <DayStat label="Expected" value={totals.total} tone="muted" />
          <DayStat
            label="Checked in"
            value={totals.checkedIn}
            tone="success"
          />
          <DayStat label="Absent" value={totals.absent} tone="danger" />
          <DayStat label="Excused" value={totals.excused} tone="warning" />
        </div>
      ) : null}

      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {sessionRows.length === 0 ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
            <CalendarDays className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-3 text-sm text-muted">No classes scheduled today.</p>
            <p className="mt-1 text-sm text-muted">
              Add time slots to a classroom, then enroll students — they&apos;ll
              show up here on their day automatically.
            </p>
          </div>
          {diagnosticBareCount !== null ? (
            <details className="rounded-md border border-line bg-bg/40 px-3 py-2 text-xs text-muted">
              <summary className="cursor-pointer font-medium text-ink">
                Diagnostics
              </summary>
              <dl className="mt-2 space-y-1 font-mono">
                <div>Tenant: {user.tenantId ?? "(none)"}</div>
                <div>Window: {startUtc} → {endUtc}</div>
                <div>Sessions found (bare query): {diagnosticBareCount}</div>
              </dl>
            </details>
          ) : null}
        </div>
      ) : (
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
              {rows.map((r, idx) => {
                const prev = idx > 0 ? rows[idx - 1] : null;
                const isNewSession = !prev || prev.sessionId !== r.sessionId;
                const startLocal = formatTimeInTimezone(r.startUtc, r.tz);
                const endLocal = formatTimeInTimezone(r.endUtc, r.tz);
                return (
                  <Fragment key={r.attendanceId}>
                    {isNewSession ? (
                      <SessionHeaderRow
                        sessionId={r.sessionId}
                        classroomName={r.classroomName}
                        classroomColor={r.classroomColor}
                        startLocal={startLocal}
                        endLocal={endLocal}
                        sessionExpected={
                          sessionMeta.get(r.sessionId)?.expected ?? 0
                        }
                      />
                    ) : null}
                    <StudentTableRow
                      attendanceId={r.attendanceId}
                      status={r.status}
                      checkInAt={r.checkInAt}
                      checkOutAt={r.checkOutAt}
                      startLocal={startLocal}
                      endLocal={endLocal}
                      classroomName={r.classroomName}
                      classroomColor={r.classroomColor}
                      firstName={r.firstName}
                      lastName={r.lastName}
                      isMakeup={r.isMakeup}
                      isManual={r.isManual}
                      notes={r.notes.map((n) => ({
                        body: n.body,
                        visibility: n.visibility,
                        createdAt: n.created_at,
                      }))}
                    />
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Mobile card list */}
          <ul className="divide-y divide-line md:hidden">
            {rows.map((r) => {
              const startLocal = formatTimeInTimezone(r.startUtc, r.tz);
              const endLocal = formatTimeInTimezone(r.endUtc, r.tz);
              return (
                <Fragment key={r.attendanceId}>
                  <StudentCard
                    attendanceId={r.attendanceId}
                    status={r.status}
                    checkInAt={r.checkInAt}
                    checkOutAt={r.checkOutAt}
                    startLocal={startLocal}
                    endLocal={endLocal}
                    classroomName={r.classroomName}
                    classroomColor={r.classroomColor}
                    firstName={r.firstName}
                    lastName={r.lastName}
                    isMakeup={r.isMakeup}
                    isManual={r.isManual}
                    notes={r.notes.map((n) => ({
                      body: n.body,
                      visibility: n.visibility,
                      createdAt: n.created_at,
                    }))}
                  />
                  <li className="px-3 pb-3">
                    <LessonNoteWidget
                      attendanceId={r.attendanceId}
                      existingNotes={r.notes.map((n) => ({
                        body: n.body,
                        visibility:
                          n.visibility === "parent" ? "parent" : "internal",
                        createdAt: n.created_at,
                      }))}
                    />
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </div>
      )}
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

function DayStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "muted" | "success" | "danger" | "warning";
}) {
  const toneClasses = {
    muted: "from-bg to-surface text-ink",
    success: "from-success-soft to-surface text-success",
    danger: "from-danger/10 to-surface text-danger",
    warning: "from-warning/10 to-surface text-warning",
  } as const;
  const accentClasses = {
    muted: "bg-line",
    success: "bg-success",
    danger: "bg-danger",
    warning: "bg-warning",
  } as const;
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-gradient-to-br p-4 shadow-card transition hover:-translate-y-px hover:shadow-lift ${toneClasses[tone]}`}
    >
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1 ${accentClasses[tone]}`}
      />
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}
