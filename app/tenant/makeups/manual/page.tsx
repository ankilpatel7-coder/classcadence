import Link from "next/link";
import { ChevronLeft, UserPlus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();

  const today = new Date().toISOString().slice(0, 10);

  // 1. Active enrollments to figure out which classroom each student is in.
  const { data: enrollmentsRaw } = await supabase
    .from("enrollments")
    .select(
      "student_id, time_slots!inner(classroom_id, classrooms!inner(id, name, color, default_capacity, status, locations!inner(name, iana_timezone, status)))"
    )
    .or(`effective_to.is.null,effective_to.gt.${today}`);

  type EnrRaw = {
    student_id: string;
    time_slots: {
      classroom_id: string;
      classrooms: {
        id: string;
        name: string;
        color: string;
        default_capacity: number;
        status: string;
        locations: { name: string; iana_timezone: string; status: string };
      };
    };
  };
  const enrollmentsTyped = (enrollmentsRaw ?? []) as unknown as EnrRaw[];

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
    if (e.time_slots.classrooms.status !== "active") continue;
    if (e.time_slots.classrooms.locations.status !== "active") continue;
    if (!studentClassroom.has(e.student_id)) {
      studentClassroom.set(e.student_id, {
        classroomId: e.time_slots.classrooms.id,
        classroomName: e.time_slots.classrooms.name,
        classroomColor: e.time_slots.classrooms.color,
        defaultCapacity: e.time_slots.classrooms.default_capacity,
        locationName: e.time_slots.classrooms.locations.name,
        tz: e.time_slots.classrooms.locations.iana_timezone,
      });
    }
  }

  // 2. Fetch the matching student records.
  const studentIds = Array.from(studentClassroom.keys());
  const { data: studentsData } =
    studentIds.length > 0
      ? await supabase
          .from("students")
          .select("id, first_name, last_name")
          .in("id", studentIds)
      : { data: [] };

  const students: ManualStudent[] = (studentsData ?? [])
    .map((s) => {
      const cls = studentClassroom.get(s.id as string)!;
      return {
        id: s.id as string,
        name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
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
  const { data: classroomSlots } =
    uniqueClassroomIds.length > 0
      ? await supabase
          .from("time_slots")
          .select("id, classroom_id, capacity_override")
          .in("classroom_id", uniqueClassroomIds)
          .eq("status", "active")
      : { data: [] };

  const slotIds = (classroomSlots ?? []).map((s) => s.id as string);
  const slotToClassroom = new Map<string, string>();
  const slotCapOverride = new Map<string, number | null>();
  for (const s of classroomSlots ?? []) {
    slotToClassroom.set(
      s.id as string,
      s.classroom_id as string
    );
    slotCapOverride.set(
      s.id as string,
      (s.capacity_override as number | null) ?? null
    );
  }

  const now = new Date().toISOString();
  const horizonIso = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: upcomingSessions } =
    slotIds.length > 0
      ? await supabase
          .from("sessions")
          .select(
            "id, scheduled_start_utc, scheduled_end_utc, time_slot_id, status"
          )
          .in("time_slot_id", slotIds)
          .gte("scheduled_start_utc", now)
          .lte("scheduled_start_utc", horizonIso)
          .neq("status", "cancelled")
          .order("scheduled_start_utc", { ascending: true })
      : { data: [] };

  // 4. Enrollment counts per session + which students are already on each.
  const sessionIds = (upcomingSessions ?? []).map((s) => s.id as string);
  const { data: attendanceData } =
    sessionIds.length > 0
      ? await supabase
          .from("attendance_records")
          .select("session_id, student_id, status")
          .in("session_id", sessionIds)
      : { data: [] };

  const enrolledBySession = new Map<string, number>();
  const studentSessionPairs = new Set<string>();
  for (const a of attendanceData ?? []) {
    const sid = a.session_id as string;
    if (a.status !== "absent" && a.status !== "excused") {
      enrolledBySession.set(sid, (enrolledBySession.get(sid) ?? 0) + 1);
    }
    studentSessionPairs.add(`${a.student_id}_${sid}`);
  }

  // 5. Group upcoming sessions by classroom for the client component.
  type ClassroomSession = ManualSessionOption;
  const sessionsByClassroom = new Map<string, ClassroomSession[]>();
  for (const s of upcomingSessions ?? []) {
    const cid = slotToClassroom.get(s.time_slot_id as string);
    if (!cid) continue;
    const cls = Array.from(studentClassroom.values()).find(
      (c) => c.classroomId === cid
    );
    if (!cls) continue;
    const cap = slotCapOverride.get(s.time_slot_id as string) ?? cls.defaultCapacity;
    const arr = sessionsByClassroom.get(cid) ?? [];
    arr.push({
      id: s.id as string,
      startUtc: s.scheduled_start_utc as string,
      endUtc: s.scheduled_end_utc as string,
      tz: cls.tz,
      capacity: cap,
      enrolled: enrolledBySession.get(s.id as string) ?? 0,
    });
    sessionsByClassroom.set(cid, arr);
  }

  // Build a per-student sessions list, filtering out sessions the student is
  // already on so the picker only shows addable ones.
  const sessionsByStudent: Record<string, ManualSessionOption[]> = {};
  for (const student of students) {
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

      {students.length === 0 ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-ink">
          No students with active enrollments yet. Enroll a student first, then
          you can manually add them to other sessions.
        </div>
      ) : (
        <ManualClassForm
          students={students}
          sessionsByStudent={sessionsByStudent}
        />
      )}
    </div>
  );
}
