import { Sparkles, X } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { formatTimeInTimezone } from "@/lib/time";
import { StudentAvatar } from "@/app/_components/StudentAvatar";
import { OfferMakeupButton } from "@/app/tenant/today/OfferMakeupButton";

export const metadata = { title: "Make-ups — ClassCadence" };
export const dynamic = "force-dynamic";

type AbsenceRow = {
  attendanceId: string;
  status: string;
  sessionStartUtc: string;
  sessionEndUtc: string;
  tz: string;
  classroomName: string;
  classroomColor: string;
  locationName: string;
  studentName: string;
  studentId: string;
  offer:
    | {
        state: "pending" | "accepted" | "declined" | "expired";
        expiresAt: string;
      }
    | null;
};

export default async function MakeupsPage({
  searchParams,
}: {
  searchParams: { makeup_url?: string; error?: string };
}) {
  await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Step 1: attendance rows marked absent OR made_up in the past 30 days.
  const { data: attendanceData } = await supabase
    .from("attendance_records")
    .select("id, status, session_id, student_id")
    .in("status", ["absent", "made_up"]);

  const attendanceIds = (attendanceData ?? []).map((a) => a.id as string);
  const sessionIds = Array.from(
    new Set((attendanceData ?? []).map((a) => a.session_id as string))
  );
  const studentIds = Array.from(
    new Set((attendanceData ?? []).map((a) => a.student_id as string))
  );

  if (attendanceIds.length === 0) {
    return <EmptyState />;
  }

  // Step 2: pull sessions, students, and any existing make-up offers in parallel.
  const [sessionsResult, studentsResult, offersResult] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, scheduled_start_utc, scheduled_end_utc, time_slot_id")
      .in("id", sessionIds)
      .gte("scheduled_start_utc", thirtyDaysAgo)
      .order("scheduled_start_utc", { ascending: false }),
    supabase
      .from("students")
      .select("id, first_name, last_name")
      .in("id", studentIds),
    supabase
      .from("makeup_offers")
      .select("absent_attendance_id, state, expires_at")
      .in("absent_attendance_id", attendanceIds),
  ]);

  const sessionsArr = sessionsResult.data ?? [];
  const studentsArr = studentsResult.data ?? [];
  const offersArr = offersResult.data ?? [];

  const slotIds = Array.from(
    new Set(sessionsArr.map((s) => s.time_slot_id as string))
  );
  const { data: slotsData } = await supabase
    .from("time_slots")
    .select("id, classroom_id")
    .in("id", slotIds);

  const classroomIds = Array.from(
    new Set((slotsData ?? []).map((s) => s.classroom_id as string))
  );
  const { data: classroomsData } = await supabase
    .from("classrooms")
    .select("id, name, color, location_id")
    .in("id", classroomIds);

  const locationIds = Array.from(
    new Set((classroomsData ?? []).map((c) => c.location_id as string))
  );
  const { data: locationsData } = await supabase
    .from("locations")
    .select("id, name, iana_timezone")
    .in("id", locationIds);

  const sessionMap = new Map(sessionsArr.map((s) => [s.id as string, s]));
  const slotMap = new Map(
    (slotsData ?? []).map((s) => [s.id as string, s.classroom_id as string])
  );
  const classroomMap = new Map(
    (classroomsData ?? []).map((c) => [
      c.id as string,
      {
        name: c.name as string,
        color: c.color as string,
        location_id: c.location_id as string,
      },
    ])
  );
  const locationMap = new Map(
    (locationsData ?? []).map((l) => [
      l.id as string,
      { name: l.name as string, iana_timezone: l.iana_timezone as string },
    ])
  );
  const studentMap = new Map(
    studentsArr.map((s) => [
      s.id as string,
      `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
    ])
  );
  const offerMap = new Map(
    offersArr.map((o) => [
      o.absent_attendance_id as string,
      {
        state: o.state as "pending" | "accepted" | "declined" | "expired",
        expiresAt: o.expires_at as string,
      },
    ])
  );

  const rows: AbsenceRow[] = (attendanceData ?? [])
    .map<AbsenceRow | null>((a) => {
      const session = sessionMap.get(a.session_id as string);
      if (!session) return null;
      const classroomId = slotMap.get(session.time_slot_id as string);
      if (!classroomId) return null;
      const classroom = classroomMap.get(classroomId);
      if (!classroom) return null;
      const location = locationMap.get(classroom.location_id);
      if (!location) return null;
      const studentName = studentMap.get(a.student_id as string) ?? "Unknown";
      return {
        attendanceId: a.id as string,
        status: a.status as string,
        sessionStartUtc: session.scheduled_start_utc as string,
        sessionEndUtc: session.scheduled_end_utc as string,
        tz: location.iana_timezone,
        classroomName: classroom.name,
        classroomColor: classroom.color,
        locationName: location.name,
        studentName,
        studentId: a.student_id as string,
        offer: offerMap.get(a.id as string) ?? null,
      };
    })
    .filter((x): x is AbsenceRow => x !== null)
    .sort((a, b) =>
      b.sessionStartUtc.localeCompare(a.sessionStartUtc)
    );

  const needsOffer = rows.filter(
    (r) => r.status === "absent" && (!r.offer || r.offer.state === "expired" || r.offer.state === "declined")
  );
  const pending = rows.filter(
    (r) => r.offer?.state === "pending"
  );
  const completed = rows.filter(
    (r) => r.status === "made_up" || r.offer?.state === "accepted"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Make-ups</h1>
        <p className="mt-1 text-sm text-muted">
          Offer a make-up class to students who were absent. Past 30 days.
        </p>
      </div>

      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {searchParams.makeup_url ? (
        <div className="rounded-md border border-primary/30 bg-primary-soft/40 px-4 py-3 text-sm text-ink">
          <p className="font-medium text-primary-strong">Make-up offer created.</p>
          <p className="mt-1 text-xs text-muted">
            Share this link with the parent — it expires in 7 days.
          </p>
          <p className="mt-2 break-all rounded-md border border-line bg-surface px-2 py-1 font-mono text-xs">
            {decodeURIComponent(searchParams.makeup_url)}
          </p>
        </div>
      ) : null}

      <Section
        title="Needs a make-up"
        emptyLabel="No outstanding absences to offer make-ups for."
        rows={needsOffer}
        renderActions={(r) => (
          <OfferMakeupButton attendanceId={r.attendanceId} />
        )}
      />

      <Section
        title="Pending response"
        emptyLabel="No make-up offers waiting on a parent response."
        rows={pending}
        renderActions={(r) =>
          r.offer ? (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
              Sent · expires {new Date(r.offer.expiresAt).toLocaleDateString()}
            </span>
          ) : null
        }
      />

      <Section
        title="Completed"
        emptyLabel="No accepted or made-up classes yet."
        rows={completed}
        renderActions={(r) => (
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
            {r.status === "made_up" ? "Made up" : "Accepted"}
          </span>
        )}
      />
    </div>
  );
}

function Section({
  title,
  emptyLabel,
  rows,
  renderActions,
}: {
  title: string;
  emptyLabel: string;
  rows: AbsenceRow[];
  renderActions: (r: AbsenceRow) => React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <header className="border-b border-line bg-bg/40 px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          {title} · {rows.length}
        </h2>
      </header>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li
              key={r.attendanceId}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              style={{
                borderLeft: `4px solid ${r.classroomColor}`,
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <StudentAvatar name={r.studentName} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {r.studentName}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(r.sessionStartUtc).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {" · "}
                    {formatTimeInTimezone(r.sessionStartUtc, r.tz)}–
                    {formatTimeInTimezone(r.sessionEndUtc, r.tz)}
                  </p>
                  <p className="text-[10px] text-muted">
                    {r.classroomName} · {r.locationName}
                  </p>
                </div>
              </div>
              <div className="shrink-0">{renderActions(r)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Make-ups</h1>
        <p className="mt-1 text-sm text-muted">
          Offer a make-up class to students who were absent. Past 30 days.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-muted" />
        <p className="mt-3 text-sm text-muted">No absences in the past 30 days.</p>
        <p className="mt-1 text-sm text-muted">
          Once a student is marked absent on Today, they&apos;ll show up here.
        </p>
      </div>
    </div>
  );
}
