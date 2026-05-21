import { CalendarDays } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import {
  formatTimeInTimezone,
  localToUtc,
  todayInTimezone,
} from "@/lib/time";
import { AttendanceRowActions } from "./AttendanceRowActions";

export const metadata = { title: "Today — ClassCadence" };
export const dynamic = "force-dynamic";

type AttendanceRow = {
  id: string;
  status: string;
  check_in_at: string | null;
  check_out_at: string | null;
  students: { id: string; first_name: string; last_name: string };
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

const STATUS_BADGE: Record<string, string> = {
  expected: "bg-line text-muted",
  present: "bg-success-soft text-success",
  late: "bg-warning/10 text-warning",
  absent: "bg-danger/10 text-danger",
  excused: "bg-bg text-muted",
  made_up: "bg-primary-soft text-primary-strong",
};

export default async function TodayPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  // Pick the first active location as the "primary" timezone for the page header.
  // (Multi-location tenants are still supported — we group by location below.)
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, iana_timezone")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const primaryLocation = locations?.[0];
  const primaryTz = primaryLocation?.iana_timezone ?? "UTC";
  const today = todayInTimezone(primaryTz);

  // Sessions whose UTC start falls within today's local window for the primary tz.
  const startUtc = localToUtc(today, "00:00", primaryTz).toISOString();
  const endUtc = localToUtc(today, "23:59", primaryTz).toISOString();

  const { data: sessionsData } = await supabase
    .from("sessions")
    .select(
      `id,
       scheduled_start_utc,
       scheduled_end_utc,
       status,
       time_slots!inner(
         classrooms!inner(
           name, color,
           locations!inner(id, name, iana_timezone)
         )
       ),
       attendance_records(
         id, status, check_in_at, check_out_at,
         students!inner(id, first_name, last_name)
       )`
    )
    .gte("scheduled_start_utc", startUtc)
    .lte("scheduled_start_utc", endUtc)
    .order("scheduled_start_utc", { ascending: true });

  const sessions = ((sessionsData ?? []) as unknown as SessionRow[]).filter(
    (s) => s.status !== "cancelled"
  );

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
          {locations && locations.length > 1
            ? ` · grouped by location (times shown in each location's timezone)`
            : primaryLocation
              ? ` · ${primaryLocation.name}`
              : ""}
        </p>
      </div>

      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
          <CalendarDays className="mx-auto h-6 w-6 text-muted" />
          <p className="mt-3 text-sm text-muted">No sessions scheduled today.</p>
          <p className="mt-1 text-sm text-muted">
            Materialize sessions on the Settings page if you&apos;ve recently added
            time slots or enrollments.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const tz =
              session.time_slots.classrooms.locations.iana_timezone ?? primaryTz;
            const startLabel = formatTimeInTimezone(session.scheduled_start_utc, tz);
            const endLabel = formatTimeInTimezone(session.scheduled_end_utc, tz);
            const classroom = session.time_slots.classrooms;
            const records = (session.attendance_records ?? []).sort((a, b) =>
              `${a.students.last_name} ${a.students.first_name}`.localeCompare(
                `${b.students.last_name} ${b.students.first_name}`
              )
            );

            return (
              <section
                key={session.id}
                className="rounded-lg border border-line bg-surface shadow-card"
              >
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      style={{ backgroundColor: classroom.color }}
                      className="h-3 w-3 rounded-full border border-line"
                    />
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {startLabel}–{endLabel}
                        <span className="ml-2 text-muted">·</span>{" "}
                        <span className="text-muted">{classroom.name}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {classroom.locations.name}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted">
                    {records.length} expected
                  </p>
                </header>

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
                            <span
                              className={`rounded-full px-2 py-0.5 font-medium ${
                                STATUS_BADGE[r.status] ?? "bg-line text-muted"
                              }`}
                            >
                              {r.status}
                            </span>
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
      )}
    </div>
  );
}
