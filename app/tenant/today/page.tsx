import { CalendarDays, CheckCheck, Sparkles, StickyNote } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import {
  formatTimeInTimezone,
  localToUtc,
  todayInTimezone,
} from "@/lib/time";
import { AttendanceRowActions } from "./AttendanceRowActions";
import { checkInAllExpectedAction } from "./actions";
import { loadSessionsInWindow } from "./load-sessions";
import { StudentAvatar } from "@/app/_components/StudentAvatar";
import { StatusBadge } from "@/app/_components/StatusIcon";
import { LiveTimer } from "@/app/_components/LiveTimer";
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
  const supabase = createSupabaseServerClient();

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, iana_timezone")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const primaryLocation = locations?.[0];
  const primaryTz = primaryLocation?.iana_timezone ?? "UTC";
  const today = todayInTimezone(primaryTz);

  const startUtc = localToUtc(today, "00:00", primaryTz).toISOString();
  const endUtc = localToUtc(today, "23:59", primaryTz).toISOString();

  const sessions: SessionRow[] = await loadSessionsInWindow(startUtc, endUtc);

  // Diagnostic: if rendering empty, check the bare count to distinguish
  // "no data" from "data dropped by join".
  let diagnosticBareCount: number | null = null;
  if (sessions.length === 0) {
    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_start_utc", startUtc)
      .lte("scheduled_start_utc", endUtc);
    diagnosticBareCount = count ?? 0;
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
  const totals = sessions.reduce(
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

  const rows: FlatRow[] = sessions
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

      {sessions.length > 0 ? (
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

      {sessions.length === 0 ? (
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
        <div className="panel overflow-hidden">
          {/* Desktop table */}
          <table className="hidden min-w-full divide-y divide-line md:table">
            <thead className="bg-bg/60">
              <tr>
                <Th>Time</Th>
                <Th>Class</Th>
                <Th>Student</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {rows.map((r, idx) => {
                const prev = idx > 0 ? rows[idx - 1] : null;
                const isNewSession = !prev || prev.sessionId !== r.sessionId;
                return (
                  <Row
                    key={r.attendanceId}
                    r={r}
                    isFirstOfSession={isNewSession}
                    sessionExpected={
                      sessionMeta.get(r.sessionId)?.expected ?? 0
                    }
                  />
                );
              })}
            </tbody>
          </table>

          {/* Mobile card list */}
          <ul className="divide-y divide-line md:hidden">
            {rows.map((r) => (
              <li
                key={r.attendanceId}
                className="space-y-2 p-3"
                style={{
                  borderLeft: `4px solid ${r.classroomColor}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StudentAvatar
                      name={`${r.firstName} ${r.lastName}`}
                      size={26}
                    />
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                        {r.firstName} {r.lastName}
                        {r.isMakeup ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-strong">
                            <Sparkles className="h-2.5 w-2.5" />
                            Make-up
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[10px] text-muted">
                        {formatTimeInTimezone(r.startUtc, r.tz)}–
                        {formatTimeInTimezone(r.endUtc, r.tz)} · {r.classroomName}
                      </p>
                      {r.checkInAt ? (
                        <div className="mt-1">
                          <LiveTimer since={r.checkInAt} until={r.checkOutAt} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <AttendanceRowActions
                    attendanceId={r.attendanceId}
                    status={r.status}
                    checkedIn={!!r.checkInAt}
                    checkedOut={!!r.checkOutAt}
                  />
                </div>
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
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({
  r,
  isFirstOfSession,
  sessionExpected,
}: {
  r: {
    attendanceId: string;
    sessionId: string;
    startUtc: string;
    endUtc: string;
    tz: string;
    classroomName: string;
    classroomColor: string;
    locationName: string;
    firstName: string;
    lastName: string;
    status: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    isMakeup: boolean;
    isManual: boolean;
    notes: { body: string; visibility: string; created_at: string }[];
  };
  isFirstOfSession: boolean;
  sessionExpected: number;
}) {
  return (
    <>
      {isFirstOfSession ? (
        <tr className="bg-bg/30">
          <td colSpan={5} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: r.classroomColor }}
                />
                <p className="text-sm font-semibold uppercase tracking-wider text-ink">
                  {formatTimeInTimezone(r.startUtc, r.tz)}–
                  {formatTimeInTimezone(r.endUtc, r.tz)} · {r.classroomName}
                </p>
              </div>
              {sessionExpected > 0 ? (
                <form action={checkInAllExpectedAction}>
                  <input type="hidden" name="session_id" value={r.sessionId} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-1.5 text-xs font-semibold text-white shadow-emboss hover:brightness-110"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Check in all expected ({sessionExpected})
                  </button>
                </form>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}

      <tr className="hover:bg-bg/40">
        <td className="px-4 py-3 text-sm font-medium text-ink tabular-nums">
          {formatTimeInTimezone(r.startUtc, r.tz)}
        </td>
        <td className="px-4 py-3 text-sm text-muted">{r.classroomName}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <StudentAvatar
              name={`${r.firstName} ${r.lastName}`}
              size={32}
            />
            <div>
              <p className="flex flex-wrap items-center gap-1.5 text-base font-semibold text-ink">
                {r.firstName} {r.lastName}
                {r.isMakeup ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary-strong">
                    <Sparkles className="h-3 w-3" />
                    Make-up
                  </span>
                ) : null}
                {r.isManual ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                    <Sparkles className="h-3 w-3" />
                    Manual
                  </span>
                ) : null}
              </p>
              {r.checkInAt ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>
                    In{" "}
                    {new Date(r.checkInAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <LiveTimer since={r.checkInAt} until={r.checkOutAt} />
                  {r.checkOutAt ? (
                    <span>
                      Out{" "}
                      {new Date(r.checkOutAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </td>
        <td className="px-4 py-2">
          <StatusBadge status={r.status} />
        </td>
        <td className="px-4 py-2 text-right">
          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
            <AttendanceRowActions
              attendanceId={r.attendanceId}
              status={r.status}
              checkedIn={!!r.checkInAt}
              checkedOut={!!r.checkOutAt}
            />
            {r.notes.length > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[10px] text-muted"
                title={r.notes.map((n) => n.body).join("\n")}
              >
                <StickyNote className="h-3 w-3" />
                {r.notes.length}
              </span>
            ) : null}
          </div>
        </td>
      </tr>
    </>
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
  return (
    <div
      className={`rounded-lg border border-line bg-gradient-to-br p-4 shadow-card ${toneClasses[tone]}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}
