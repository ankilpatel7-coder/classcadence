import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { and, eq, ne, gte, lte, inArray, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendanceRecords,
  sessions,
  timeSlots,
  classrooms,
  locations,
  students,
} from "@/lib/db/schema";
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
  const user = await getCurrentUserOrRedirect();

  // 1. Absent attendance row joined through to its location so we can both
  //    enforce tenant isolation in code and anchor the picker on the original
  //    session/classroom. Join on session_id (the enrolled session) —
  //    see [[attendance-sessions-embed]].
  const [absent] = await db
    .select({
      id: attendanceRecords.id,
      status: attendanceRecords.status,
      sessionId: attendanceRecords.sessionId,
      studentId: attendanceRecords.studentId,
      sessionStartUtc: sessions.scheduledStartUtc,
      sessionEndUtc: sessions.scheduledEndUtc,
      classroomId: classrooms.id,
      classroomName: classrooms.name,
      classroomColor: classrooms.color,
      classroomDefaultCapacity: classrooms.defaultCapacity,
      locationName: locations.name,
      tz: locations.ianaTimezone,
    })
    .from(attendanceRecords)
    .innerJoin(sessions, eq(sessions.id, attendanceRecords.sessionId))
    .innerJoin(timeSlots, eq(timeSlots.id, sessions.timeSlotId))
    .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
    .innerJoin(locations, eq(locations.id, classrooms.locationId))
    .where(
      and(
        eq(attendanceRecords.id, params.id),
        eq(locations.tenantId, user.tenantId!)
      )
    )
    .limit(1);
  if (!absent) notFound();

  const [student] = await db
    .select({
      firstName: students.firstName,
      lastName: students.lastName,
    })
    .from(students)
    .where(eq(students.id, absent.studentId))
    .limit(1);

  // 3. All time slots for that classroom, then upcoming sessions for the next 30 days.
  const classroomSlots = await db
    .select({
      id: timeSlots.id,
      capacityOverride: timeSlots.capacityOverride,
    })
    .from(timeSlots)
    .where(
      and(
        eq(timeSlots.classroomId, absent.classroomId),
        eq(timeSlots.status, "active")
      )
    );
  const slotIds = classroomSlots.map((s) => s.id);
  const capByTimeSlot = new Map<string, number | null>();
  for (const s of classroomSlots) {
    capByTimeSlot.set(s.id, s.capacityOverride ?? null);
  }

  const now = new Date();
  const horizonDays = 30;
  const horizon = new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000);

  const upcomingSessions = await db
    .select({
      id: sessions.id,
      scheduledStartUtc: sessions.scheduledStartUtc,
      scheduledEndUtc: sessions.scheduledEndUtc,
      timeSlotId: sessions.timeSlotId,
      status: sessions.status,
    })
    .from(sessions)
    .where(
      and(
        inArray(
          sessions.timeSlotId,
          slotIds.length > 0
            ? slotIds
            : ["00000000-0000-0000-0000-000000000000"]
        ),
        gte(sessions.scheduledStartUtc, now),
        lte(sessions.scheduledStartUtc, horizon),
        ne(sessions.status, "cancelled")
      )
    )
    .orderBy(asc(sessions.scheduledStartUtc));

  const sessionIds = upcomingSessions.map((s) => s.id);

  // 4. Count enrollments per session and check whether this student is already in any.
  const attendanceData =
    sessionIds.length > 0
      ? await db
          .select({
            sessionId: attendanceRecords.sessionId,
            studentId: attendanceRecords.studentId,
            status: attendanceRecords.status,
          })
          .from(attendanceRecords)
          .where(inArray(attendanceRecords.sessionId, sessionIds))
      : [];

  const enrolledBySession = new Map<string, number>();
  const studentAlreadyIn = new Set<string>();
  for (const a of attendanceData) {
    const sid = a.sessionId;
    if (a.status !== "absent" && a.status !== "excused") {
      enrolledBySession.set(sid, (enrolledBySession.get(sid) ?? 0) + 1);
    }
    if (a.studentId === absent.studentId) studentAlreadyIn.add(sid);
  }

  const tz = absent.tz ?? "UTC";

  const sessionOptions: SessionOption[] = upcomingSessions.map((s) => {
    const cap =
      capByTimeSlot.get(s.timeSlotId) ?? absent.classroomDefaultCapacity;
    const enrolled = enrolledBySession.get(s.id) ?? 0;
    return {
      id: s.id,
      startUtc: s.scheduledStartUtc.toISOString(),
      endUtc: s.scheduledEndUtc.toISOString(),
      tz,
      capacity: cap,
      enrolled,
      isStudentIn: studentAlreadyIn.has(s.id),
    };
  });

  const studentName =
    `${student?.firstName ?? ""} ${student?.lastName ?? ""}`.trim() ||
    "this student";
  const originalDateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(absent.sessionStartUtc);

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
          Pick one or more upcoming sessions in {absent.classroomName}. Each pick adds
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
                absent.sessionStartUtc.toISOString(),
                tz
              )}
              –
              {formatTimeInTimezone(
                absent.sessionEndUtc.toISOString(),
                tz
              )}{" "}
              · {absent.classroomName}
              {absent.locationName ? ` · ${absent.locationName}` : ""}
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
          No upcoming sessions in {absent.classroomName} for the next {horizonDays} days.
          Add more time slots to the classroom (or wait for the schedule to roll
          forward).
        </div>
      ) : (
        <MakeupOfferForm
          attendanceId={absent.id}
          studentName={studentName}
          tz={tz}
          sessions={sessionOptions}
        />
      )}
    </div>
  );
}
