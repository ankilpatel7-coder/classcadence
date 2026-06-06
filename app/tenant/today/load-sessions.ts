import { and, asc, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  sessions,
  timeSlots,
  classrooms,
  locations,
  attendanceRecords,
  students,
  lessonNotes,
} from "@/lib/db/schema";

export type LoadedAttendance = {
  id: string;
  status: string;
  check_in_at: string | null;
  check_out_at: string | null;
  is_makeup: boolean;
  is_manual: boolean;
  students: { id: string; first_name: string; last_name: string };
  lesson_notes: { body: string; visibility: string; created_at: string }[];
};

export type LoadedSession = {
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
  attendance_records: LoadedAttendance[];
};

// Step-by-step fetch. The session base query joins session -> time_slot ->
// classroom -> location so we can enforce tenant isolation IN CODE (the owner
// db connection bypasses RLS): filter on locations.tenantId. Attendance,
// students, and notes are then pulled with flat inArray lookups.
export async function loadSessionsInWindow(
  tenantId: string,
  startUtcIso: string,
  endUtcIso: string
): Promise<LoadedSession[]> {
  const start = new Date(startUtcIso);
  const end = new Date(endUtcIso);

  // sessions joined through to location — filtered by tenant. This both scopes
  // by tenant and hydrates classroom/location in one pass.
  const rawSessions = await db
    .select({
      id: sessions.id,
      scheduledStartUtc: sessions.scheduledStartUtc,
      scheduledEndUtc: sessions.scheduledEndUtc,
      status: sessions.status,
      classroomName: classrooms.name,
      classroomColor: classrooms.color,
      locationId: locations.id,
      locationName: locations.name,
      ianaTimezone: locations.ianaTimezone,
    })
    .from(sessions)
    .innerJoin(timeSlots, eq(timeSlots.id, sessions.timeSlotId))
    .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
    .innerJoin(locations, eq(locations.id, classrooms.locationId))
    .where(
      and(
        gte(sessions.scheduledStartUtc, start),
        lte(sessions.scheduledStartUtc, end),
        ne(sessions.status, "cancelled"),
        eq(locations.tenantId, tenantId)
      )
    )
    .orderBy(asc(sessions.scheduledStartUtc));

  if (rawSessions.length === 0) return [];

  const sessionIds = rawSessions.map((s) => s.id);

  // Attendance for these sessions. Join on session_id (the enrolled session),
  // never made_up_in_session_id. See [[attendance-sessions-embed]].
  const attendanceData = await db
    .select({
      id: attendanceRecords.id,
      sessionId: attendanceRecords.sessionId,
      studentId: attendanceRecords.studentId,
      status: attendanceRecords.status,
      checkInAt: attendanceRecords.checkInAt,
      checkOutAt: attendanceRecords.checkOutAt,
    })
    .from(attendanceRecords)
    .where(inArray(attendanceRecords.sessionId, sessionIds));

  if (attendanceData.length === 0) return [];

  const studentIds = uniq(attendanceData.map((a) => a.studentId).filter(Boolean));
  const attendanceIds = attendanceData.map((a) => a.id);

  const [studentsData, notesData] = await Promise.all([
    studentIds.length > 0
      ? db
          .select({
            id: students.id,
            firstName: students.firstName,
            lastName: students.lastName,
          })
          .from(students)
          .where(inArray(students.id, studentIds))
      : Promise.resolve(
          [] as { id: string; firstName: string; lastName: string }[]
        ),
    attendanceIds.length > 0
      ? db
          .select({
            attendanceRecordId: lessonNotes.attendanceRecordId,
            body: lessonNotes.body,
            visibility: lessonNotes.visibility,
            createdAt: lessonNotes.createdAt,
          })
          .from(lessonNotes)
          .where(inArray(lessonNotes.attendanceRecordId, attendanceIds))
      : Promise.resolve(
          [] as {
            attendanceRecordId: string;
            body: string;
            visibility: string;
            createdAt: Date;
          }[]
        ),
  ]);

  const studentMap = new Map<
    string,
    { id: string; first_name: string; last_name: string }
  >(
    studentsData.map((s) => [
      s.id,
      { id: s.id, first_name: s.firstName, last_name: s.lastName },
    ])
  );

  const notesByAttendance = new Map<
    string,
    { body: string; visibility: string; created_at: string }[]
  >();
  for (const n of notesData) {
    const id = n.attendanceRecordId;
    const arr = notesByAttendance.get(id) ?? [];
    arr.push({
      body: n.body,
      visibility: n.visibility,
      created_at: n.createdAt.toISOString(),
    });
    notesByAttendance.set(id, arr);
  }

  const attendanceBySession = new Map<string, LoadedAttendance[]>();
  for (const a of attendanceData) {
    const student = studentMap.get(a.studentId);
    if (!student) continue;
    const arr = attendanceBySession.get(a.sessionId) ?? [];
    arr.push({
      id: a.id,
      status: a.status,
      check_in_at: a.checkInAt ? a.checkInAt.toISOString() : null,
      check_out_at: a.checkOutAt ? a.checkOutAt.toISOString() : null,
      // is_makeup / is_manual are not modeled in the Drizzle schema; the
      // consumer treats their absence as false.
      is_makeup: false,
      is_manual: false,
      students: student,
      lesson_notes: notesByAttendance.get(a.id) ?? [],
    });
    attendanceBySession.set(a.sessionId, arr);
  }

  const out: LoadedSession[] = [];
  for (const s of rawSessions) {
    const records = attendanceBySession.get(s.id) ?? [];
    // Skip empty sessions — Today and Schedule only show classes with at
    // least one enrolled student. Empty slots clutter the view without
    // adding info.
    if (records.length === 0) continue;

    out.push({
      id: s.id,
      scheduled_start_utc: s.scheduledStartUtc.toISOString(),
      scheduled_end_utc: s.scheduledEndUtc.toISOString(),
      status: s.status,
      time_slots: {
        classrooms: {
          name: s.classroomName,
          color: s.classroomColor ?? "",
          locations: {
            id: s.locationId,
            name: s.locationName,
            iana_timezone: s.ianaTimezone,
          },
        },
      },
      attendance_records: records,
    });
  }
  return out;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
