import { CalendarDays } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import {
  formatTimeInTimezone,
  localToUtc,
  todayInTimezone,
} from "@/lib/time";
import { CheckCheck } from "lucide-react";
import { AttendanceRowActions } from "./AttendanceRowActions";
import { TodayCalendar, type CalendarSession } from "./TodayCalendar";
import { checkInAllExpectedAction } from "./actions";
import { loadSessionsInWindow, type LoadedSession } from "./load-sessions";
import { StatusBadge } from "@/app/_components/StatusIcon";

export const metadata = { title: "Today — ClassCadence" };
export const dynamic = "force-dynamic";

type SessionRow = LoadedSession;

function minutesIntoDay(utc: string, tz: string): number {
  const t = formatTimeInTimezone(utc, tz);
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: { error?: string; makeup_url?: string };
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

  // If nothing renders, ask Postgres directly so we can show diagnostics.
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

  // Compute calendar axis (pad ±30 min around earliest start / latest end).
  const allTimes = sessions.flatMap((s) => [
    minutesIntoDay(s.scheduled_start_utc, primaryTz),
    minutesIntoDay(s.scheduled_end_utc, primaryTz),
  ]);
  const axisStartMin =
    allTimes.length > 0
      ? Math.max(0, Math.floor(Math.min(...allTimes) / 30) * 30 - 30)
      : 9 * 60;
  const axisEndMin =
    allTimes.length > 0
      ? Math.min(24 * 60, Math.ceil(Math.max(...allTimes) / 30) * 30 + 30)
      : 18 * 60;

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

  const calendarSessions: CalendarSession[] = sessions.map((s) => ({
    id: s.id,
    startUtc: s.scheduled_start_utc,
    endUtc: s.scheduled_end_utc,
    tz: s.time_slots.classrooms.locations.iana_timezone ?? primaryTz,
    classroomName: s.time_slots.classrooms.name,
    classroomColor: s.time_slots.classrooms.color,
    locationName: s.time_slots.classrooms.locations.name,
    records: (s.attendance_records ?? [])
      .sort((a, b) =>
        `${a.students.last_name} ${a.students.first_name}`.localeCompare(
          `${b.students.last_name} ${b.students.first_name}`
        )
      )
      .map((r) => ({
        id: r.id,
        status: r.status,
        check_in_at: r.check_in_at,
        check_out_at: r.check_out_at,
        student: r.students,
        notes: (r.lesson_notes ?? []).map((n) => ({
          body: n.body,
          visibility: (n.visibility === "parent" ? "parent" : "internal") as
            | "parent"
            | "internal",
          createdAt: n.created_at,
        })),
      })),
  }));

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
          <DayStat
            label="Expected"
            value={totals.total}
            tone="muted"
          />
          <DayStat
            label="Checked in"
            value={totals.checkedIn}
            tone="success"
          />
          <DayStat
            label="Absent"
            value={totals.absent}
            tone="danger"
          />
          <DayStat
            label="Excused"
            value={totals.excused}
            tone="warning"
          />
        </div>
      ) : null}

      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {searchParams.makeup_url ? (
        <div className="rounded-md border border-primary/30 bg-primary-soft/40 px-4 py-3 text-sm text-ink">
          <p className="font-medium text-primary-strong">Make-up offer created.</p>
          <p className="mt-1 text-xs text-muted">
            Share this link with the parent. They can accept or decline without
            signing in. The link expires in 7 days.
          </p>
          <p className="mt-2 break-all rounded-md border border-line bg-surface px-2 py-1 font-mono text-xs">
            {decodeURIComponent(searchParams.makeup_url)}
          </p>
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
                {diagnosticBareCount > 0 ? (
                  <div className="mt-2 text-danger">
                    Bare count shows {diagnosticBareCount} sessions, but the
                    embed query returns 0 — most likely a tenant-id mismatch
                    on a joined table (students, locations). Run the
                    consistency SQL.
                  </div>
                ) : (
                  <div className="mt-2">
                    No sessions exist in this UTC window. Open
                    /tenant/settings → Force refresh schedule to materialize.
                  </div>
                )}
              </dl>
            </details>
          ) : null}
        </div>
      ) : (
        <>
          {/* Calendar view — md and up */}
          <div className="hidden md:block">
            <TodayCalendar
              sessions={calendarSessions}
              axisStartMin={axisStartMin}
              axisEndMin={axisEndMin}
            />
          </div>

          {/* List view — mobile */}
          <div className="space-y-4 md:hidden">
            {sessions.map((session) => {
              const tz =
                session.time_slots.classrooms.locations.iana_timezone ?? primaryTz;
              const startLabel = formatTimeInTimezone(
                session.scheduled_start_utc,
                tz
              );
              const endLabel = formatTimeInTimezone(session.scheduled_end_utc, tz);
              const classroom = session.time_slots.classrooms;
              const records = (session.attendance_records ?? []).sort((a, b) =>
                `${a.students.last_name} ${a.students.first_name}`.localeCompare(
                  `${b.students.last_name} ${b.students.first_name}`
                )
              );

              const expectedCount = records.filter(
                (r) => r.status === "expected"
              ).length;

              return (
                <section
                  key={session.id}
                  className="rounded-lg border border-line bg-surface shadow-card"
                  style={{ borderLeftColor: classroom.color, borderLeftWidth: 4 }}
                >
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink tabular-nums">
                        {startLabel}–{endLabel}
                      </p>
                      <p className="text-xs text-muted">
                        {classroom.name} · {classroom.locations.name}
                      </p>
                    </div>
                    <p className="text-xs text-muted">{records.length} expected</p>
                  </header>
                  {expectedCount > 0 ? (
                    <div className="flex items-center justify-between gap-2 border-b border-line bg-bg/40 px-4 py-2">
                      <span className="text-[11px] text-muted">
                        {expectedCount} still to check in
                      </span>
                      <form action={checkInAllExpectedAction}>
                        <input type="hidden" name="session_id" value={session.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-md bg-success px-2.5 py-1 text-xs font-medium text-white shadow-emboss"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Check in all
                        </button>
                      </form>
                    </div>
                  ) : null}

                  {records.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted">
                      No students enrolled in this slot yet.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {records.map((r) => (
                        <li
                          key={r.id}
                          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-ink">
                              {r.students.first_name} {r.students.last_name}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                              <StatusBadge status={r.status} />
                              {r.check_in_at ? (
                                <span>In {formatTimeInTimezone(r.check_in_at, tz)}</span>
                              ) : null}
                              {r.check_out_at ? (
                                <span>Out {formatTimeInTimezone(r.check_out_at, tz)}</span>
                              ) : null}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                            <AttendanceRowActions
                              attendanceId={r.id}
                              status={r.status}
                              checkedIn={!!r.check_in_at}
                              checkedOut={!!r.check_out_at}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
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
