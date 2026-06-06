"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  timeSlots,
  classrooms,
  locations,
  sessions,
  attendanceRecords,
  enrollments,
  lessonNotes,
} from "@/lib/db/schema";
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

export async function materializeSessions(
  days: number,
  slotIds?: string[]
) {
  // Materialization is a system operation: it creates `sessions` and
  // `attendance_records` rows derived from enrollments. The sessions table
  // intentionally has no user-write RLS policy, so this runs with the owner
  // db connection (same as the Inngest cron path).
  // Pass slotIds to limit the work to specific slots (enroll / slot save);
  // omit to materialize everything (manual Force refresh, daily cron).
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  let slots: {
    id: string;
    weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
    startTime: string;
    endTime: string;
    ianaTimezone: string;
  }[];
  try {
    slots = await db
      .select({
        id: timeSlots.id,
        weekday: timeSlots.weekday,
        startTime: timeSlots.startTime,
        endTime: timeSlots.endTime,
        ianaTimezone: locations.ianaTimezone,
      })
      .from(timeSlots)
      .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
      .innerJoin(locations, eq(locations.id, classrooms.locationId))
      .where(
        and(
          eq(timeSlots.status, "active"),
          eq(classrooms.status, "active"),
          eq(locations.status, "active"),
          slotIds && slotIds.length > 0
            ? inArray(timeSlots.id, slotIds)
            : undefined
        )
      );
  } catch (err) {
    return {
      sessionsInserted: 0,
      attendanceInserted: 0,
      error: err instanceof Error ? err.message : "Failed to load time slots.",
    };
  }

  let sessionsInserted = 0;
  let attendanceInserted = 0;

  for (const slot of slots) {
    const tz = slot.ianaTimezone;
    const dates = datesForWeekdayInRange(slot.weekday, now, until, tz);
    if (dates.length === 0) continue;

    const startHHMM = slot.startTime.slice(0, 5);
    const endHHMM = slot.endTime.slice(0, 5);

    const sessionRows = dates.map((d) => ({
      timeSlotId: slot.id,
      scheduledStartUtc: localToUtc(d, startHHMM, tz),
      scheduledEndUtc: localToUtc(d, endHHMM, tz),
    }));

    // upsert by (time_slot_id, scheduled_start_utc) which has a UNIQUE index.
    // DO UPDATE (no-op refresh of end time) so existing rows are still
    // returned — the attendance build below relies on every session row.
    let upserted: { id: string; scheduledStartUtc: Date }[];
    try {
      upserted = await db
        .insert(sessions)
        .values(sessionRows)
        .onConflictDoUpdate({
          target: [sessions.timeSlotId, sessions.scheduledStartUtc],
          set: { scheduledEndUtc: sql`excluded.scheduled_end_utc` },
        })
        .returning({
          id: sessions.id,
          scheduledStartUtc: sessions.scheduledStartUtc,
        });
    } catch (err) {
      return {
        sessionsInserted,
        attendanceInserted,
        error: err instanceof Error ? err.message : "Failed to upsert sessions.",
      };
    }
    sessionsInserted += upserted.length;

    // Pull enrollments that are active during ANY of these session dates.
    const latestDate = dates[dates.length - 1];
    const enrollmentsData = await db
      .select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        effectiveFrom: enrollments.effectiveFrom,
        effectiveTo: enrollments.effectiveTo,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.timeSlotId, slot.id),
          lte(enrollments.effectiveFrom, latestDate)
        )
      );

    const attendanceRows: { sessionId: string; studentId: string }[] = [];
    for (const session of upserted) {
      const sessionDate = session.scheduledStartUtc.toISOString().slice(0, 10);
      for (const en of enrollmentsData) {
        if (en.effectiveFrom > sessionDate) continue;
        // "ended" means effective_to is on or before sessionDate.
        if (en.effectiveTo && en.effectiveTo <= sessionDate) continue;
        attendanceRows.push({
          sessionId: session.id,
          studentId: en.studentId,
        });
      }
    }

    if (attendanceRows.length > 0) {
      let attUpsert: { id: string }[];
      try {
        attUpsert = await db
          .insert(attendanceRecords)
          .values(attendanceRows)
          .onConflictDoNothing({
            target: [attendanceRecords.sessionId, attendanceRecords.studentId],
          })
          .returning({ id: attendanceRecords.id });
      } catch (err) {
        return {
          sessionsInserted,
          attendanceInserted,
          error:
            err instanceof Error ? err.message : "Failed to upsert attendance.",
        };
      }
      attendanceInserted += attUpsert.length;
    }
  }

  revalidatePath("/tenant/today");
  return { sessionsInserted, attendanceInserted, error: null };
}

// ============ Check-in / Check-out ============
// Per-row attendance updates moved to /api/attendance (a REST route). They
// were previously a server action, but server actions are serialized per
// route by Next.js and chain a route-tree refresh after each call — a rapid
// click streak left the next navigation waiting on the queue. The REST route
// is fully decoupled from the App Router's mutation/navigation pipeline.

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

  try {
    await db.insert(lessonNotes).values({
      attendanceRecordId: parsed.data.attendance_id,
      body: parsed.data.body,
      visibility: parsed.data.visibility,
      authorId: user.id,
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to save note.",
      success: false,
    };
  }

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

  const sessionIdStr = sessionId as string;
  const now = new Date();

  try {
    await db
      .update(attendanceRecords)
      .set({ status: "present", checkInAt: now })
      .where(
        and(
          eq(attendanceRecords.sessionId, sessionIdStr),
          eq(attendanceRecords.status, "expected")
        )
      );
  } catch (err) {
    redirect(
      `/tenant/today?error=${encodeURIComponent(
        err instanceof Error ? err.message : "update-failed"
      )}`
    );
  }

  revalidatePath("/tenant/today");
}
