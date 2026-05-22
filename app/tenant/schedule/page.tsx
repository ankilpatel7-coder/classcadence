import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import {
  formatTimeInTimezone,
  localToUtc,
} from "@/lib/time";
import {
  WeekCalendar,
  type DayColumn,
  type ScheduleSession,
} from "./WeekCalendar";
import { loadSessionsInWindow } from "@/app/tenant/today/load-sessions";

export const metadata = { title: "Schedule — ClassCadence" };
export const dynamic = "force-dynamic";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function dateKey(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function buildDays(startKey: string, tz: string, todayKey: string): DayColumn[] {
  const out: DayColumn[] = [];
  // Walk 7 days from startKey using UTC arithmetic at noon (to avoid DST flips).
  const [y, m, d] = startKey.split("-").map(Number);
  for (let i = 0; i < 7; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i, 12));
    const key = dateKey(dt, tz);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).formatToParts(dt);
    const wkRaw = parts.find((p) => p.type === "weekday")?.value ?? "";
    const monthRaw = parts.find((p) => p.type === "month")?.value ?? "";
    const dayNum = parts.find((p) => p.type === "day")?.value ?? "";
    out.push({
      dayKey: key,
      label: wkRaw,
      dateLabel: `${monthRaw} ${dayNum}`,
      isToday: key === todayKey,
    });
  }
  // Silence unused-warning suppression for label arrays kept for parity.
  void WEEKDAY_LABELS;
  void MONTH_LABELS;
  return out;
}

function minutesIntoDay(utc: string, tz: string): number {
  const t = formatTimeInTimezone(utc, tz);
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function todayKey(tz: string): string {
  return dateKey(new Date(), tz);
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { start?: string };
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
  const today = todayKey(primaryTz);

  // ?start=YYYY-MM-DD selects the leftmost day. Default = today.
  const start = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.start ?? "")
    ? (searchParams.start as string)
    : today;

  const days = buildDays(start, primaryTz, today);
  const lastDay = days[days.length - 1].dayKey;

  // Query window: 00:00 of `start` to 23:59 of `lastDay` in primary tz.
  const windowStartUtc = localToUtc(start, "00:00", primaryTz).toISOString();
  const windowEndUtc = localToUtc(lastDay, "23:59", primaryTz).toISOString();

  const loaded = await loadSessionsInWindow(windowStartUtc, windowEndUtc);
  const sessions = loaded;

  let diagnosticBareCount: number | null = null;
  if (sessions.length === 0) {
    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_start_utc", windowStartUtc)
      .lte("scheduled_start_utc", windowEndUtc);
    diagnosticBareCount = count ?? 0;
    console.log(
      "[schedule] empty render — tenantId:",
      user.tenantId,
      "window:",
      windowStartUtc,
      "to",
      windowEndUtc,
      "bareSessions:",
      diagnosticBareCount
    );
  }

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

  const scheduleSessions: ScheduleSession[] = sessions.map((s) => {
    const tz = s.time_slots.classrooms.locations.iana_timezone ?? primaryTz;
    return {
      id: s.id,
      startUtc: s.scheduled_start_utc,
      endUtc: s.scheduled_end_utc,
      tz,
      classroomName: s.time_slots.classrooms.name,
      classroomColor: s.time_slots.classrooms.color,
      locationName: s.time_slots.classrooms.locations.name,
      expectedCount: s.attendance_records?.length ?? 0,
      studentNames: (s.attendance_records ?? []).map(
        (a) =>
          `${a.students.first_name ?? ""} ${a.students.last_name ?? ""}`.trim()
      ),
      dayKey: dateKey(new Date(s.scheduled_start_utc), tz),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Schedule</h1>
          <p className="mt-1 text-sm text-muted">
            Sessions for the week of {days[0].dateLabel} – {days[6].dateLabel}.
            {primaryLocation ? ` Times in ${primaryLocation.name}.` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/tenant/schedule?start=${shiftKey(start, -7)}`}
            className="btn-secondary !px-3 !py-1.5 text-sm"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Link>
          <Link
            href="/tenant/schedule"
            className="btn-secondary !px-3 !py-1.5 text-sm"
            aria-label="This week"
          >
            Today
          </Link>
          <Link
            href={`/tenant/schedule?start=${shiftKey(start, 7)}`}
            className="btn-secondary !px-3 !py-1.5 text-sm"
            aria-label="Next week"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
            <CalendarRange className="mx-auto h-6 w-6 text-muted" />
            <p className="mt-3 text-sm text-muted">No classes scheduled this week.</p>
            <p className="mt-1 text-sm text-muted">
              Add time slots to a classroom, then enroll students — their weekly
              classes will fill in here automatically.
            </p>
          </div>
          {diagnosticBareCount !== null ? (
            <details className="rounded-md border border-line bg-bg/40 px-3 py-2 text-xs text-muted">
              <summary className="cursor-pointer font-medium text-ink">
                Diagnostics
              </summary>
              <dl className="mt-2 space-y-1 font-mono">
                <div>Tenant: {user.tenantId ?? "(none)"}</div>
                <div>Window: {windowStartUtc} → {windowEndUtc}</div>
                <div>Sessions found (bare query): {diagnosticBareCount}</div>
                {diagnosticBareCount > 0 ? (
                  <div className="mt-2 text-danger">
                    Bare count shows {diagnosticBareCount} sessions, but the
                    embed query returns 0. Likely a tenant-id mismatch on a
                    joined table.
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
          {/* Calendar — md and up */}
          <div className="hidden md:block">
            <WeekCalendar
              days={days}
              sessions={scheduleSessions}
              axisStartMin={axisStartMin}
              axisEndMin={axisEndMin}
            />
          </div>

          {/* Mobile: vertical list per day */}
          <div className="space-y-6 md:hidden">
            {days.map((day) => {
              const ds = scheduleSessions.filter((s) => s.dayKey === day.dayKey);
              return (
                <section key={day.dayKey}>
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${
                          day.isToday ? "text-primary-strong" : "text-muted"
                        }`}
                      >
                        {day.label} {day.isToday ? "· Today" : ""}
                      </p>
                      <p className="text-base font-semibold text-ink">
                        {day.dateLabel}
                      </p>
                    </div>
                    <p className="text-xs text-muted">
                      {ds.length} session{ds.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {ds.length === 0 ? (
                    <p className="rounded-md border border-dashed border-line bg-bg/40 px-4 py-3 text-center text-xs text-muted">
                      No sessions.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {ds.map((s) => (
                        <li
                          key={s.id}
                          className="rounded-md border border-line bg-surface px-3 py-2 shadow-card"
                          style={{
                            borderLeftColor: s.classroomColor,
                            borderLeftWidth: 4,
                          }}
                        >
                          <p className="text-sm font-medium tabular-nums text-ink">
                            {formatTimeInTimezone(s.startUtc, s.tz)}–
                            {formatTimeInTimezone(s.endUtc, s.tz)}
                          </p>
                          <p className="text-xs text-muted">
                            {s.classroomName} · {s.locationName} ·{" "}
                            {s.expectedCount} expected
                          </p>
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
