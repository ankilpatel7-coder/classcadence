import { and, eq, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  timeSlots,
  classrooms,
  locations,
  sessions,
  enrollments,
  attendanceRecords,
} from "@/lib/db/schema";
import { inngest } from "./client";
import { datesForWeekdayInRange, localToUtc } from "@/lib/time";
import { sendDayOfReminders } from "@/lib/notifications/reminders";

// Daily materialization (BA: 06:00 local-per-location). For v1 we run it at
// 06:00 UTC for simplicity; per-location-tz scheduling will come in a follow-up.
// Re-running is safe — sessions are upserted by (time_slot_id, scheduled_start_utc).
export const materializeDaily = inngest.createFunction(
  { id: "materialize-daily", name: "Materialize sessions (daily)" },
  { cron: "0 6 * * *" },
  async ({ step }) => {
    await step.run("materialize-14-days", async () => {
      const now = new Date();
      const until = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      // Active slots whose classroom AND location are also active.
      const active = await db
        .select({
          id: timeSlots.id,
          weekday: timeSlots.weekday,
          startTime: timeSlots.startTime,
          endTime: timeSlots.endTime,
          tz: locations.ianaTimezone,
        })
        .from(timeSlots)
        .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
        .innerJoin(locations, eq(locations.id, classrooms.locationId))
        .where(
          and(
            eq(timeSlots.status, "active"),
            eq(classrooms.status, "active"),
            eq(locations.status, "active")
          )
        );

      let sessionsInserted = 0;
      let attendanceInserted = 0;

      for (const slot of active) {
        const tz = slot.tz;
        const dates = datesForWeekdayInRange(slot.weekday, now, until, tz);
        if (dates.length === 0) continue;
        const sStart = slot.startTime.slice(0, 5);
        const sEnd = slot.endTime.slice(0, 5);
        const rows = dates.map((d) => ({
          timeSlotId: slot.id,
          scheduledStartUtc: localToUtc(d, sStart, tz),
          scheduledEndUtc: localToUtc(d, sEnd, tz),
        }));

        // ON CONFLICT DO UPDATE ... RETURNING gives us both inserted and
        // existing rows for this slot's dates (so attendance can be filled in).
        const upserted = await db
          .insert(sessions)
          .values(rows)
          .onConflictDoUpdate({
            target: [sessions.timeSlotId, sessions.scheduledStartUtc],
            set: { scheduledEndUtc: sql`excluded.scheduled_end_utc` },
          })
          .returning({
            id: sessions.id,
            scheduledStartUtc: sessions.scheduledStartUtc,
          });
        sessionsInserted += upserted.length;

        const earliest = dates[0];
        const latest = dates[dates.length - 1];
        const enrolled = await db
          .select({
            studentId: enrollments.studentId,
            effectiveFrom: enrollments.effectiveFrom,
            effectiveTo: enrollments.effectiveTo,
          })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.timeSlotId, slot.id),
              lte(enrollments.effectiveFrom, latest)
            )
          );

        const attendanceRows: { sessionId: string; studentId: string }[] = [];
        for (const session of upserted) {
          const sessionDate = session.scheduledStartUtc.toISOString().slice(0, 10);
          for (const en of enrolled) {
            if (en.effectiveFrom > latest) continue;
            if (en.effectiveTo && en.effectiveTo < earliest) continue;
            if (en.effectiveFrom > sessionDate) continue;
            if (en.effectiveTo && en.effectiveTo < sessionDate) continue;
            attendanceRows.push({
              sessionId: session.id,
              studentId: en.studentId,
            });
          }
        }
        if (attendanceRows.length > 0) {
          const att = await db
            .insert(attendanceRecords)
            .values(attendanceRows)
            .onConflictDoNothing({
              target: [attendanceRecords.sessionId, attendanceRecords.studentId],
            })
            .returning({ id: attendanceRecords.id });
          attendanceInserted += att.length;
        }
      }

      return { sessionsInserted, attendanceInserted };
    });
  }
);

// Day-of class reminder. Fires once per morning (UTC) and sends a single
// reminder email per (student, session) for any session starting in the
// next 18 hours where the student is still 'expected'.
export const dayOfRemindersFn = inngest.createFunction(
  { id: "day-of-reminders", name: "Day-of class reminder emails" },
  { cron: "0 12 * * *" }, // 12:00 UTC = ~7am CDT / 8am CST / 5am PDT
  async ({ step }) => {
    return await step.run("send-reminders", async () => {
      const result = await sendDayOfReminders({ windowHours: 18 });
      return { remindersSent: result.sent, skipped: result.skipped };
    });
  }
);

// Marks any 'expected' attendance as 'absent' when the session ended at least
// 30 minutes ago (BA 8.9 absence detection). Runs every 15 minutes.
export const markAbsentFn = inngest.createFunction(
  { id: "mark-absent", name: "Mark absent for ended sessions" },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    await step.run("mark", async () => {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000);

      const ended = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(lte(sessions.scheduledEndUtc, cutoff), ne(sessions.status, "cancelled"))
        );

      const sessionIds = ended.map((s) => s.id);
      if (sessionIds.length === 0) return { markedAbsent: 0 };

      const marked = await db
        .update(attendanceRecords)
        .set({ status: "absent" })
        .where(
          and(
            eq(attendanceRecords.status, "expected"),
            inArray(attendanceRecords.sessionId, sessionIds)
          )
        )
        .returning({ id: attendanceRecords.id });

      return { markedAbsent: marked.length };
    });
  }
);
