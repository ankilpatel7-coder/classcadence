import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoadedAttendance = {
  id: string;
  status: string;
  check_in_at: string | null;
  check_out_at: string | null;
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

// Step-by-step fetch — avoids the deeply nested PostgREST embed that was
// silently returning zero rows (sessions visible via RLS but the embed
// drop). Each query here is flat and uses .in() lookups.
export async function loadSessionsInWindow(
  startUtcIso: string,
  endUtcIso: string
): Promise<LoadedSession[]> {
  const supabase = createSupabaseServerClient();

  const { data: rawSessions } = await supabase
    .from("sessions")
    .select("id, scheduled_start_utc, scheduled_end_utc, status, time_slot_id")
    .gte("scheduled_start_utc", startUtcIso)
    .lte("scheduled_start_utc", endUtcIso)
    .neq("status", "cancelled")
    .order("scheduled_start_utc", { ascending: true });

  if (!rawSessions || rawSessions.length === 0) return [];

  const slotIds = uniq(
    rawSessions.map((s) => s.time_slot_id as string).filter(Boolean)
  );
  const sessionIds = rawSessions.map((s) => s.id as string);

  const { data: slotsData } = await supabase
    .from("time_slots")
    .select("id, classroom_id")
    .in("id", slotIds);
  const slotMap = new Map<string, { classroom_id: string }>(
    (slotsData ?? []).map((s) => [
      s.id as string,
      { classroom_id: s.classroom_id as string },
    ])
  );

  const classroomIds = uniq(
    (slotsData ?? []).map((s) => s.classroom_id as string).filter(Boolean)
  );
  const { data: classroomsData } = await supabase
    .from("classrooms")
    .select("id, name, color, location_id")
    .in("id", classroomIds);
  const classroomMap = new Map<
    string,
    { name: string; color: string; location_id: string }
  >(
    (classroomsData ?? []).map((c) => [
      c.id as string,
      {
        name: c.name as string,
        color: c.color as string,
        location_id: c.location_id as string,
      },
    ])
  );

  const locationIds = uniq(
    (classroomsData ?? []).map((c) => c.location_id as string).filter(Boolean)
  );
  const { data: locationsData } = await supabase
    .from("locations")
    .select("id, name, iana_timezone")
    .in("id", locationIds);
  const locationMap = new Map<
    string,
    { id: string; name: string; iana_timezone: string }
  >(
    (locationsData ?? []).map((l) => [
      l.id as string,
      {
        id: l.id as string,
        name: l.name as string,
        iana_timezone: l.iana_timezone as string,
      },
    ])
  );

  const { data: attendanceData } = await supabase
    .from("attendance_records")
    .select("id, session_id, student_id, status, check_in_at, check_out_at")
    .in("session_id", sessionIds);

  const studentIds = uniq(
    (attendanceData ?? []).map((a) => a.student_id as string).filter(Boolean)
  );
  const { data: studentsData } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .in("id", studentIds);
  const studentMap = new Map<
    string,
    { id: string; first_name: string; last_name: string }
  >(
    (studentsData ?? []).map((s) => [
      s.id as string,
      {
        id: s.id as string,
        first_name: s.first_name as string,
        last_name: s.last_name as string,
      },
    ])
  );

  const attendanceIds = (attendanceData ?? []).map((a) => a.id as string);
  let notesByAttendance = new Map<
    string,
    { body: string; visibility: string; created_at: string }[]
  >();
  if (attendanceIds.length > 0) {
    const { data: notesData } = await supabase
      .from("lesson_notes")
      .select("attendance_record_id, body, visibility, created_at")
      .in("attendance_record_id", attendanceIds);
    for (const n of notesData ?? []) {
      const id = n.attendance_record_id as string;
      const arr = notesByAttendance.get(id) ?? [];
      arr.push({
        body: n.body as string,
        visibility: n.visibility as string,
        created_at: n.created_at as string,
      });
      notesByAttendance.set(id, arr);
    }
  }

  const attendanceBySession = new Map<string, LoadedAttendance[]>();
  for (const a of attendanceData ?? []) {
    const student = studentMap.get(a.student_id as string);
    if (!student) continue;
    const arr = attendanceBySession.get(a.session_id as string) ?? [];
    arr.push({
      id: a.id as string,
      status: a.status as string,
      check_in_at: a.check_in_at as string | null,
      check_out_at: a.check_out_at as string | null,
      students: student,
      lesson_notes: notesByAttendance.get(a.id as string) ?? [],
    });
    attendanceBySession.set(a.session_id as string, arr);
  }

  const out: LoadedSession[] = [];
  for (const s of rawSessions) {
    const slot = slotMap.get(s.time_slot_id as string);
    if (!slot) continue;
    const classroom = classroomMap.get(slot.classroom_id);
    if (!classroom) continue;
    const location = locationMap.get(classroom.location_id);
    if (!location) continue;

    const records = attendanceBySession.get(s.id as string) ?? [];
    // Skip empty sessions — Today and Schedule only show classes with at
    // least one enrolled student. Empty slots clutter the view without
    // adding info.
    if (records.length === 0) continue;

    out.push({
      id: s.id as string,
      scheduled_start_utc: s.scheduled_start_utc as string,
      scheduled_end_utc: s.scheduled_end_utc as string,
      status: s.status as string,
      time_slots: {
        classrooms: {
          name: classroom.name,
          color: classroom.color,
          locations: location,
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
