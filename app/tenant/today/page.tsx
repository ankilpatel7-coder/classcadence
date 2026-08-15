import { CalendarDays } from "lucide-react";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  locations as locationsTable,
  sessions,
  timeSlots,
  classrooms,
  students as studentsTable,
} from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import {
  formatTimeInTimezone,
  localToUtc,
  todayInTimezone,
} from "@/lib/time";
import { loadSessionsInWindow } from "./load-sessions";
import { ManualCheckIn } from "./ManualCheckIn";
import { TodayList } from "./TodayList";
import type { TodayRow } from "./types";

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
  // Times are localized here so the client list never has to know about
  // timezones.
  const rows: TodayRow[] = sessionRows
    .flatMap((s) => {
      const tz = s.time_slots.classrooms.locations.iana_timezone ?? primaryTz;
      return (s.attendance_records ?? []).map<TodayRow>((r) => ({
        attendanceId: r.id,
        sessionId: s.id,
        startUtc: s.scheduled_start_utc,
        endUtc: s.scheduled_end_utc,
        startLocal: formatTimeInTimezone(s.scheduled_start_utc, tz),
        endLocal: formatTimeInTimezone(s.scheduled_end_utc, tz),
        classroomName: s.time_slots.classrooms.name,
        classroomColor: s.time_slots.classrooms.color,
        firstName: r.students.first_name,
        lastName: r.students.last_name,
        status: r.status,
        checkInAt: r.check_in_at,
        checkOutAt: r.check_out_at,
        isMakeup: r.is_makeup,
        isManual: r.is_manual,
        notes: (r.lesson_notes ?? []).map((n) => ({
          body: n.body,
          visibility: n.visibility,
          createdAt: n.created_at,
        })),
      }));
    })
    .sort((a, b) => {
      if (a.startUtc !== b.startUtc) return a.startUtc.localeCompare(b.startUtc);
      return `${a.lastName} ${a.firstName}`.localeCompare(
        `${b.lastName} ${b.firstName}`
      );
    });

  // For the manual check-in picker: every active student in the tenant, and
  // every session scheduled today (including ones with no roster yet, which
  // loadSessionsInWindow skips). Parallel since neither depends on the other.
  const [activeStudents, todaySessionOptions] = await Promise.all([
    db
      .select({
        id: studentsTable.id,
        firstName: studentsTable.firstName,
        lastName: studentsTable.lastName,
      })
      .from(studentsTable)
      .where(
        and(
          eq(studentsTable.tenantId, tenantId),
          eq(studentsTable.lifecycleStatus, "active")
        )
      )
      .orderBy(asc(studentsTable.lastName), asc(studentsTable.firstName)),
    db
      .select({
        id: sessions.id,
        startUtc: sessions.scheduledStartUtc,
        tz: locationsTable.ianaTimezone,
        classroomName: classrooms.name,
      })
      .from(sessions)
      .innerJoin(timeSlots, eq(timeSlots.id, sessions.timeSlotId))
      .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
      .innerJoin(locationsTable, eq(locationsTable.id, classrooms.locationId))
      .where(
        and(
          eq(locationsTable.tenantId, tenantId),
          gte(sessions.scheduledStartUtc, new Date(startUtc)),
          lte(sessions.scheduledStartUtc, new Date(endUtc))
        )
      )
      .orderBy(asc(sessions.scheduledStartUtc)),
  ]);

  const manualSessionOptions = todaySessionOptions.map((s) => ({
    id: s.id,
    label: `${formatTimeInTimezone(
      s.startUtc.toISOString(),
      s.tz ?? primaryTz
    )} · ${s.classroomName}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
        <ManualCheckIn
          students={activeStudents}
          sessions={manualSessionOptions}
        />
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
        <TodayList rows={rows} />
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
