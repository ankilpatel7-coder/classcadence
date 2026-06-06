import Link from "next/link";
import { ChevronLeft, UserPlus } from "lucide-react";
import {
  and,
  or,
  eq,
  ne,
  gt,
  gte,
  lte,
  inArray,
  isNull,
  asc,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  enrollments,
  timeSlots,
  classrooms,
  locations,
  students,
  sessions,
  attendanceRecords,
} from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import {
  ManualClassForm,
  type ManualSessionOption,
  type ManualStudent,
} from "./ManualClassForm";

export const metadata = { title: "Manually add class — ClassCadence" };
export const dynamic = "force-dynamic";

export default async function ManualClassPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await getCurrentUserOrRedirect();

  const today = new Date().toISOString().slice(0, 10);

  // 1. Active enrollments to figure out which classroom each student is in.
  //    Tenant isolation via location.tenantId.
  const enrollmentsTyped = await db
    .select({
      studentId: enrollments.studentId,
      classroomId: classrooms.id,
      classroomName: classrooms.name,
      classroomColor: classrooms.color,
      defaultCapacity: classrooms.defaultCapacity,
      classroomStatus: classrooms.status,
      locationName: locations.name,
      tz: locations.ianaTimezone,
      locationStatus: locations.status,
    })
    .from(enrollments)
    .innerJoin(timeSlots, eq(timeSlots.id, enrollments.timeSlotId))
    .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
    .innerJoin(locations, eq(locations.id, classrooms.locationId))
    .where(
      and(
        eq(locations.tenantId, user.tenantId!),
        or(isNull(enrollments.effectiveTo), gt(enrollments.effectiveTo, today))
      )
    );

  type StudentClassroom = {
    classroomId: string;
    classroomName: string;
    classroomColor: string;
    defaultCapacity: number;
    locationName: string;
    tz: string;
  };
  const studentClassroom = new Map<string, StudentClassroom>();
  for (const e of enrollmentsTyped) {
    if (e.classroomStatus !== "active") continue;
    if (e.locationStatus !== "active") continue;
    if (!studentClassroom.has(e.studentId)) {
      studentClassroom.set(e.studentId, {
        classroomId: e.classroomId,
        classroomName: e.classroomName,
        classroomColor: e.classroomColor ?? "#1E3A8A",
        defaultCapacity: e.defaultCapacity,
        locationName: e.locationName,
        tz: e.tz,
      });
    }
  }

  // 2. Fetch the matching student records.
  const studentIds = Array.from(studentClassroom.keys());
  const studentsData =
    studentIds.length > 0
      ? await db
          .select({
            id: students.id,
            firstName: students.firstName,
            lastName: students.lastName,
          })
          .from(students)
          .where(inArray(students.id, studentIds))
      : [];

  const studentsList: ManualStudent[] = studentsData
    .map((s) => {
      const cls = studentClassroom.get(s.id)!;
      return {
        id: s.id,
        name: `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim(),
        classroomId: cls.classroomId,
        classroomName: cls.classroomName,
        locationName: cls.locationName,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // 3. For each unique classroom, fetch upcoming sessions + capacity.
  const uniqueClassroomIds = Array.from(
    new Set(Array.from(studentClassroom.values()).map((c) => c.classroomId))
  );
  const classroomSlots =
    uniqueClassroomIds.length > 0
      ? await db
          .select({
            id: timeSlots.id,
            classroomId: timeSlots.classroomId,
            capacityOverride: timeSlots.capacityOverride,
          })
          .from(timeSlots)
          .where(
            and(
              inArray(timeSlots.classroomId, uniqueClassroomIds),
              eq(timeSlots.status, "active")
            )
          )
      : [];

  const slotIds = classroomSlots.map((s) => s.id);
  const slotToClassroom = new Map<string, string>();
  const slotCapOverride = new Map<string, number | null>();
  for (const s of classroomSlots) {
    slotToClassroom.set(s.id, s.classroomId);
    slotCapOverride.set(s.id, s.capacityOverride ?? null);
  }

  const now = new Date();
  const horizon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const upcomingSessions =
    slotIds.length > 0
      ? await db
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
              inArray(sessions.timeSlotId, slotIds),
              gte(sessions.scheduledStartUtc, now),
              lte(sessions.scheduledStartUtc, horizon),
              ne(sessions.status, "cancelled")
            )
          )
          .orderBy(asc(sessions.scheduledStartUtc))
      : [];

  // 4. Enrollment counts per session + which students are already on each.
  const sessionIds = upcomingSessions.map((s) => s.id);
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
  const studentSessionPairs = new Set<string>();
  for (const a of attendanceData) {
    const sid = a.sessionId;
    if (a.status !== "absent" && a.status !== "excused") {
      enrolledBySession.set(sid, (enrolledBySession.get(sid) ?? 0) + 1);
    }
    studentSessionPairs.add(`${a.studentId}_${sid}`);
  }

  // 5. Group upcoming sessions by classroom for the client component.
  type ClassroomSession = ManualSessionOption;
  const sessionsByClassroom = new Map<string, ClassroomSession[]>();
  for (const s of upcomingSessions) {
    const cid = slotToClassroom.get(s.timeSlotId);
    if (!cid) continue;
    const cls = Array.from(studentClassroom.values()).find(
      (c) => c.classroomId === cid
    );
    if (!cls) continue;
    const cap = slotCapOverride.get(s.timeSlotId) ?? cls.defaultCapacity;
    const arr = sessionsByClassroom.get(cid) ?? [];
    arr.push({
      id: s.id,
      startUtc: s.scheduledStartUtc.toISOString(),
      endUtc: s.scheduledEndUtc.toISOString(),
      tz: cls.tz,
      capacity: cap,
      enrolled: enrolledBySession.get(s.id) ?? 0,
    });
    sessionsByClassroom.set(cid, arr);
  }

  // Build a per-student sessions list, filtering out sessions the student is
  // already on so the picker only shows addable ones.
  const sessionsByStudent: Record<string, ManualSessionOption[]> = {};
  for (const student of studentsList) {
    const classroomSessions = sessionsByClassroom.get(student.classroomId) ?? [];
    sessionsByStudent[student.id] = classroomSessions
      .filter((s) => !studentSessionPairs.has(`${student.id}_${s.id}`))
      .map((s) => ({ ...s }));
  }

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
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <UserPlus className="h-5 w-5 text-accent" />
          Manually add class
        </h1>
        <p className="mt-1 text-sm text-muted">
          One-off addition. The student appears on the picked session(s) on
          Today and Schedule with a &quot;Manual&quot; tag, separate from their
          recurring weekly enrollment.
        </p>
      </div>

      {searchParams.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(searchParams.error)}
        </div>
      ) : null}

      {studentsList.length === 0 ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
          No students with active enrollments yet. Enroll a student first, then
          you can manually add them to other sessions.
        </div>
      ) : (
        <ManualClassForm
          students={studentsList}
          sessionsByStudent={sessionsByStudent}
        />
      )}
    </div>
  );
}
