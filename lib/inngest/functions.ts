import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";
import { datesForWeekdayInRange, localToUtc } from "@/lib/time";
import { sendDayOfReminders } from "@/lib/notifications/reminders";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

// Daily materialization (BA: 06:00 local-per-location). For v1 we run it at
// 06:00 UTC for simplicity; per-location-tz scheduling will come in a follow-up.
// Re-running is safe — sessions are upserted by (time_slot_id, scheduled_start_utc).
export const materializeDaily = inngest.createFunction(
  { id: "materialize-daily", name: "Materialize sessions (daily)" },
  { cron: "0 6 * * *" },
  async ({ step }) => {
    await step.run("materialize-14-days", async () => {
      const supabase = adminClient();
      const now = new Date();
      const until = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

      type SlotRow = {
        id: string;
        weekday: Weekday;
        start_time: string;
        end_time: string;
        classrooms: {
          status: string;
          locations: { id: string; iana_timezone: string; status: string };
        };
      };

      const { data: slots } = await supabase
        .from("time_slots")
        .select(
          "id, weekday, start_time, end_time, status, classrooms!inner(status, locations!inner(id, iana_timezone, status))"
        )
        .eq("status", "active");

      const active = ((slots ?? []) as unknown as SlotRow[]).filter(
        (s) =>
          s.classrooms?.status === "active" && s.classrooms?.locations?.status === "active"
      );

      let sessionsInserted = 0;
      let attendanceInserted = 0;

      for (const slot of active) {
        const tz = slot.classrooms.locations.iana_timezone;
        const dates = datesForWeekdayInRange(slot.weekday, now, until, tz);
        if (dates.length === 0) continue;
        const sStart = slot.start_time.slice(0, 5);
        const sEnd = slot.end_time.slice(0, 5);
        const rows = dates.map((d) => ({
          time_slot_id: slot.id,
          scheduled_start_utc: localToUtc(d, sStart, tz).toISOString(),
          scheduled_end_utc: localToUtc(d, sEnd, tz).toISOString(),
        }));
        const { data: upserted } = await supabase
          .from("sessions")
          .upsert(rows, {
            onConflict: "time_slot_id,scheduled_start_utc",
            ignoreDuplicates: false,
          })
          .select("id, scheduled_start_utc");
        sessionsInserted += upserted?.length ?? 0;

        const earliest = dates[0];
        const latest = dates[dates.length - 1];
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("id, student_id, effective_from, effective_to")
          .eq("time_slot_id", slot.id)
          .lte("effective_from", latest);

        const attendanceRows: { session_id: string; student_id: string }[] = [];
        for (const session of upserted ?? []) {
          const sessionDate = String(session.scheduled_start_utc).slice(0, 10);
          for (const en of enrollments ?? []) {
            if ((en.effective_from as string) > latest) continue;
            if (en.effective_to && (en.effective_to as string) < earliest) continue;
            if ((en.effective_from as string) > sessionDate) continue;
            if (en.effective_to && (en.effective_to as string) < sessionDate) continue;
            attendanceRows.push({
              session_id: session.id as string,
              student_id: en.student_id as string,
            });
          }
        }
        if (attendanceRows.length > 0) {
          const { data: att } = await supabase
            .from("attendance_records")
            .upsert(attendanceRows, {
              onConflict: "session_id,student_id",
              ignoreDuplicates: true,
            })
            .select("id");
          attendanceInserted += att?.length ?? 0;
        }
      }

      return { sessionsInserted, attendanceInserted };
    });
  }
);

// Day-of class reminder. Fires once per morning (UTC) and sends a single
// reminder email per (student, session) for any session starting in the
// next 18 hours where the student is still 'expected'. 18h matches a
// typical morning-of cadence: a 7am CST cron fires at 12 UTC, catching
// every class up through about 6am the next day in tenant-local time.
//
// Idempotency: Inngest's step.run is checkpointed, so within a single
// execution we won't double-send. Across separate firings (manual
// re-trigger), a parent could in rare cases receive two reminders for
// the same session — acceptable for v1; we'll add dedup if it bites.
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
      const supabase = adminClient();
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      // Find sessions that ended at least 30 min ago and have any still-expected attendance.
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id")
        .lte("scheduled_end_utc", cutoff)
        .neq("status", "cancelled");

      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) return { markedAbsent: 0 };

      const { data: marked, error } = await supabase
        .from("attendance_records")
        .update({ status: "absent" })
        .eq("status", "expected")
        .in("session_id", sessionIds)
        .select("id");
      if (error) throw error;
      return { markedAbsent: marked?.length ?? 0 };
    });
  }
);
