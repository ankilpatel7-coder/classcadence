import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { formatTimeInTimezone } from "@/lib/time";
import { StudentAvatar } from "@/app/_components/StudentAvatar";
import { MakeupOfferForm, type SessionOption } from "./MakeupOfferForm";

export const metadata = { title: "Offer make-up — ClassCadence" };
export const dynamic = "force-dynamic";

export default async function OfferMakeupPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  // 1. Absent attendance row. Defensive select — omits is_makeup so the
  //    query stays valid even if the column migration hasn't been applied.
  const { data: absent } = await supabase
    .from("attendance_records")
    .select("id, status, session_id, student_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!absent) notFound();

  // 2. Original session + slot + classroom + location to anchor the picker.
  const { data: session } = await supabase
    .from("sessions")
    .select("id, scheduled_start_utc, scheduled_end_utc, time_slot_id")
    .eq("id", absent.session_id as string)
    .maybeSingle();
  if (!session) notFound();

  const { data: slot } = await supabase
    .from("time_slots")
    .select("classroom_id")
    .eq("id", session.time_slot_id as string)
    .maybeSingle();
  if (!slot) notFound();

  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, name, color, default_capacity, location_id")
    .eq("id", slot.classroom_id as string)
    .maybeSingle();
  if (!classroom) notFound();

  const { data: location } = await supabase
    .from("locations")
    .select("name, iana_timezone")
    .eq("id", classroom.location_id as string)
    .maybeSingle();

  const { data: student } = await supabase
    .from("students")
    .select("first_name, last_name")
    .eq("id", absent.student_id as string)
    .maybeSingle();

  // 3. All time slots for that classroom, then upcoming sessions for the next 30 days.
  const { data: classroomSlots } = await supabase
    .from("time_slots")
    .select("id, capacity_override")
    .eq("classroom_id", classroom.id)
    .eq("status", "active");
  const slotIds = (classroomSlots ?? []).map((s) => s.id as string);
  const capByTimeSlot = new Map<string, number | null>();
  for (const s of classroomSlots ?? []) {
    capByTimeSlot.set(
      s.id as string,
      (s.capacity_override as number | null) ?? null
    );
  }

  const now = new Date().toISOString();
  const horizonDays = 30;
  const horizon = new Date(
    Date.now() + horizonDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: upcomingSessions } = await supabase
    .from("sessions")
    .select(
      "id, scheduled_start_utc, scheduled_end_utc, time_slot_id, status"
    )
    .in("time_slot_id", slotIds.length > 0 ? slotIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("scheduled_start_utc", now)
    .lte("scheduled_start_utc", horizon)
    .neq("status", "cancelled")
    .order("scheduled_start_utc", { ascending: true });

  const sessionIds = (upcomingSessions ?? []).map((s) => s.id as string);

  // 4. Count enrollments per session and check whether this student is already in any.
  const { data: attendanceData } =
    sessionIds.length > 0
      ? await supabase
          .from("attendance_records")
          .select("session_id, student_id, status")
          .in("session_id", sessionIds)
      : { data: [] };

  const enrolledBySession = new Map<string, number>();
  const studentAlreadyIn = new Set<string>();
  for (const a of attendanceData ?? []) {
    const sid = a.session_id as string;
    if (a.status !== "absent" && a.status !== "excused") {
      enrolledBySession.set(sid, (enrolledBySession.get(sid) ?? 0) + 1);
    }
    if (a.student_id === absent.student_id) studentAlreadyIn.add(sid);
  }

  const tz = location?.iana_timezone ?? "UTC";

  const sessionOptions: SessionOption[] = (upcomingSessions ?? []).map((s) => {
    const cap =
      capByTimeSlot.get(s.time_slot_id as string) ?? classroom.default_capacity;
    const enrolled = enrolledBySession.get(s.id as string) ?? 0;
    return {
      id: s.id as string,
      startUtc: s.scheduled_start_utc as string,
      endUtc: s.scheduled_end_utc as string,
      tz,
      capacity: cap,
      enrolled,
      isStudentIn: studentAlreadyIn.has(s.id as string),
    };
  });

  const studentName =
    `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim() ||
    "this student";
  const originalDateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(session.scheduled_start_utc as string));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/tenant/makeups"
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Make-ups
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink">Offer make-up class</h1>
        <p className="mt-1 text-sm text-muted">
          Pick one or more upcoming sessions in {classroom.name}. Each pick adds
          the student to that session as a make-up.
        </p>
      </div>

      <section className="panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <StudentAvatar name={studentName} size={36} />
          <div>
            <p className="text-sm font-medium text-ink">{studentName}</p>
            <p className="text-xs text-muted">
              Missed {originalDateLabel} ·{" "}
              {formatTimeInTimezone(
                session.scheduled_start_utc as string,
                tz
              )}
              –
              {formatTimeInTimezone(
                session.scheduled_end_utc as string,
                tz
              )}{" "}
              · {classroom.name}
              {location?.name ? ` · ${location.name}` : ""}
            </p>
          </div>
        </div>
      </section>

      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {sessionOptions.length === 0 ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
          No upcoming sessions in {classroom.name} for the next {horizonDays} days.
          Add more time slots to the classroom (or wait for the schedule to roll
          forward).
        </div>
      ) : (
        <MakeupOfferForm
          attendanceId={absent.id as string}
          studentName={studentName}
          tz={tz}
          sessions={sessionOptions}
        />
      )}
    </div>
  );
}
