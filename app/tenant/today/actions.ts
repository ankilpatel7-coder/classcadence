"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import {
  datesForWeekdayInRange,
  localToUtc,
} from "@/lib/time";

function canWriteAttendance(role: string | null | undefined) {
  return (
    role === "tenant_admin" ||
    role === "location_admin" ||
    role === "front_desk" ||
    role === "super_admin"
  );
}

// ============ Session materialization (manual; Inngest version later) ============

type TimeSlotRow = {
  id: string;
  weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  start_time: string; // "HH:MM:SS"
  end_time: string;
  status: string;
  classrooms: {
    status: string;
    locations: { id: string; iana_timezone: string; status: string };
  };
};

type EnrollmentForSlot = {
  id: string;
  student_id: string;
  effective_from: string;
  effective_to: string | null;
};

export async function materializeSessionsAction(_formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (
    user.role !== "tenant_admin" &&
    user.role !== "super_admin"
  ) {
    redirect("/tenant?error=forbidden");
  }
  const result = await materializeSessions(14);
  const params = new URLSearchParams({
    materialized_sessions: String(result.sessionsInserted),
    materialized_attendance: String(result.attendanceInserted),
  });
  if (result.error) params.set("error", result.error);
  redirect(`/tenant/settings?${params.toString()}`);
}

export async function materializeSessions(days: number) {
  // Materialization is a system operation: it creates `sessions` and
  // `attendance_records` rows derived from enrollments. The sessions table
  // intentionally has no user-write RLS policy, so this runs with the
  // service-role client (same as the Inngest cron path).
  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const { data: slots, error: slotsError } = await supabase
    .from("time_slots")
    .select(
      "id, weekday, start_time, end_time, status, classrooms!inner(status, locations!inner(id, iana_timezone, status))"
    )
    .eq("status", "active");
  if (slotsError) return { sessionsInserted: 0, attendanceInserted: 0, error: slotsError.message };

  const activeSlots = ((slots ?? []) as unknown as TimeSlotRow[]).filter(
    (s) => s.classrooms?.status === "active" && s.classrooms?.locations?.status === "active"
  );

  let sessionsInserted = 0;
  let attendanceInserted = 0;

  for (const slot of activeSlots) {
    const tz = slot.classrooms.locations.iana_timezone;
    const dates = datesForWeekdayInRange(slot.weekday, now, until, tz);
    if (dates.length === 0) continue;

    const startHHMM = slot.start_time.slice(0, 5);
    const endHHMM = slot.end_time.slice(0, 5);

    const sessionRows = dates.map((d) => ({
      time_slot_id: slot.id,
      scheduled_start_utc: localToUtc(d, startHHMM, tz).toISOString(),
      scheduled_end_utc: localToUtc(d, endHHMM, tz).toISOString(),
    }));

    // upsert by (time_slot_id, scheduled_start_utc) which has a UNIQUE index.
    const { data: upserted, error: upsertErr } = await supabase
      .from("sessions")
      .upsert(sessionRows, {
        onConflict: "time_slot_id,scheduled_start_utc",
        ignoreDuplicates: false,
      })
      .select("id, scheduled_start_utc");

    if (upsertErr) {
      return { sessionsInserted, attendanceInserted, error: upsertErr.message };
    }
    sessionsInserted += upserted?.length ?? 0;

    // Pull enrollments that are active during ANY of these session dates.
    const earliestDate = dates[0];
    const latestDate = dates[dates.length - 1];
    const { data: enrollmentsData } = await supabase
      .from("enrollments")
      .select("id, student_id, effective_from, effective_to")
      .eq("time_slot_id", slot.id)
      .lte("effective_from", latestDate);

    const enrollments = (enrollmentsData ?? []) as EnrollmentForSlot[];

    const attendanceRows: { session_id: string; student_id: string }[] = [];
    for (const session of upserted ?? []) {
      const sessionDate = (session.scheduled_start_utc as string).slice(0, 10);
      for (const en of enrollments) {
        if (en.effective_from > sessionDate) continue;
        // "ended" means effective_to is on or before sessionDate.
        if (en.effective_to && en.effective_to <= sessionDate) continue;
        attendanceRows.push({ session_id: session.id, student_id: en.student_id });
      }
    }

    if (attendanceRows.length > 0) {
      const { data: attUpsert, error: attErr } = await supabase
        .from("attendance_records")
        .upsert(attendanceRows, {
          onConflict: "session_id,student_id",
          ignoreDuplicates: true,
        })
        .select("id");
      if (attErr) {
        return { sessionsInserted, attendanceInserted, error: attErr.message };
      }
      attendanceInserted += attUpsert?.length ?? 0;
    }
  }

  revalidatePath("/tenant/today");
  return { sessionsInserted, attendanceInserted, error: null };
}

// ============ Check-in / Check-out ============

const AttendanceUpdateSchema = z.object({
  attendance_id: z.string().uuid(),
  action: z.enum(["check_in", "check_out", "mark_absent", "mark_excused", "reset"]),
});

export async function updateAttendanceAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canWriteAttendance(user.role)) redirect("/tenant/today?error=forbidden");

  const parsed = AttendanceUpdateSchema.safeParse({
    attendance_id: formData.get("attendance_id"),
    action: formData.get("action"),
  });
  if (!parsed.success) redirect("/tenant/today?error=invalid-input");

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  let updates: Record<string, unknown> = {};

  switch (parsed.data.action) {
    case "check_in":
      updates = { status: "present", check_in_at: nowIso };
      break;
    case "check_out":
      updates = { check_out_at: nowIso };
      break;
    case "mark_absent":
      updates = { status: "absent" };
      break;
    case "mark_excused":
      updates = { status: "excused" };
      break;
    case "reset":
      updates = {
        status: "expected",
        check_in_at: null,
        check_out_at: null,
      };
      break;
  }

  const { error } = await supabase
    .from("attendance_records")
    .update(updates)
    .eq("id", parsed.data.attendance_id);
  if (error) redirect(`/tenant/today?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/tenant/today");
  redirect("/tenant/today");
}

// ============ Lesson notes (BA 8.16) ============

const NoteSchema = z.object({
  attendance_id: z.string().uuid(),
  body: z.string().trim().min(1, "Note cannot be empty.").max(2000),
  visibility: z.enum(["internal", "parent"]).default("internal"),
});

export type LessonNoteState = { error: string | null; success: boolean };

export async function saveLessonNoteAction(
  _prev: LessonNoteState,
  formData: FormData
): Promise<LessonNoteState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWriteAttendance(user.role)) {
    return { error: "Not allowed.", success: false };
  }

  const parsed = NoteSchema.safeParse({
    attendance_id: formData.get("attendance_id"),
    body: formData.get("body"),
    visibility: formData.get("visibility") || "internal",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("lesson_notes").insert({
    attendance_record_id: parsed.data.attendance_id,
    body: parsed.data.body,
    visibility: parsed.data.visibility,
    author_id: user.id,
  });
  if (error) return { error: error.message, success: false };

  revalidatePath("/tenant/today");
  return { error: null, success: true };
}

// ============ Bulk check-in for one session ============

export async function checkInAllExpectedAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canWriteAttendance(user.role)) redirect("/tenant/today?error=forbidden");

  const sessionId = formData.get("session_id");
  if (typeof sessionId !== "string" || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    redirect("/tenant/today?error=invalid-session");
  }

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("attendance_records")
    .update({ status: "present", check_in_at: nowIso })
    .eq("session_id", sessionId)
    .eq("status", "expected");

  if (error) redirect(`/tenant/today?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/tenant/today");
  redirect("/tenant/today");
}
