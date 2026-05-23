import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";
import {
  datesForWeekdayInRange,
  localToUtc,
  formatTimeInTimezone,
} from "@/lib/time";
import { sendEmail } from "@/lib/email/client";

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
    await step.run("send-reminders", async () => {
      const supabase = adminClient();
      const now = new Date();
      const until = new Date(now.getTime() + 18 * 60 * 60 * 1000);

      // Sessions within the window. Pulls everything needed for the
      // email in a single embedded query.
      const { data: sessions } = await supabase
        .from("sessions")
        .select(
          "id, scheduled_start_utc, scheduled_end_utc, time_slots!inner(classrooms!inner(name, locations!inner(iana_timezone, tenants!inner(id, name))))"
        )
        .gte("scheduled_start_utc", now.toISOString())
        .lte("scheduled_start_utc", until.toISOString())
        .neq("status", "cancelled");

      type SessionRow = {
        id: string;
        scheduled_start_utc: string;
        scheduled_end_utc: string;
        time_slots: {
          classrooms: {
            name: string;
            locations: {
              iana_timezone: string;
              tenants: { id: string; name: string };
            };
          };
        };
      };
      const ses = (sessions ?? []) as unknown as SessionRow[];
      if (ses.length === 0) return { remindersSent: 0 };

      // Map session_id -> session row for fast lookup.
      const sessionById = new Map<string, SessionRow>();
      for (const s of ses) sessionById.set(s.id, s);

      // Attendance rows still 'expected' for these sessions.
      const sessionIds = ses.map((s) => s.id);
      const { data: attendance } = await supabase
        .from("attendance_records")
        .select("session_id, student_id")
        .in("session_id", sessionIds)
        .eq("status", "expected");

      type AttRow = { session_id: string; student_id: string };
      const att = (attendance ?? []) as unknown as AttRow[];
      if (att.length === 0) return { remindersSent: 0 };

      // Batch student lookup.
      const studentIds = Array.from(new Set(att.map((a) => a.student_id)));
      const { data: students } = await supabase
        .from("students")
        .select(
          "id, first_name, last_name, primary_parent_name, primary_email, notification_prefs_json"
        )
        .in("id", studentIds);

      type StudentRow = {
        id: string;
        first_name: string;
        last_name: string;
        primary_parent_name: string | null;
        primary_email: string | null;
        notification_prefs_json: { email?: boolean } | null;
      };
      const studentById = new Map<string, StudentRow>();
      for (const s of (students ?? []) as unknown as StudentRow[]) {
        studentById.set(s.id, s);
      }

      let sent = 0;
      for (const row of att) {
        const session = sessionById.get(row.session_id);
        const student = studentById.get(row.student_id);
        if (!session || !student) continue;

        const wantsEmail = student.notification_prefs_json?.email !== false;
        if (!wantsEmail || !student.primary_email) continue;

        const tz = session.time_slots.classrooms.locations.iana_timezone;
        const classroomName = session.time_slots.classrooms.name;
        const tenantName = session.time_slots.classrooms.locations.tenants.name;
        const studentName = `${student.first_name} ${student.last_name}`.trim();
        const startLocal = formatTimeInTimezone(
          session.scheduled_start_utc,
          tz
        );
        const endLocal = formatTimeInTimezone(
          session.scheduled_end_utc,
          tz
        );
        const sessionDate = new Date(
          session.scheduled_start_utc
        ).toLocaleDateString("en-US", {
          timeZone: tz,
          weekday: "long",
          month: "short",
          day: "numeric",
        });

        const greeting = student.primary_parent_name
          ? `Hi ${student.primary_parent_name},`
          : "Hi there,";

        const text = [
          greeting,
          "",
          `Just a reminder: ${studentName} has class today.`,
          "",
          `  • ${sessionDate} ${startLocal} – ${endLocal} — ${classroomName}`,
          "",
          `See you there!`,
          "",
          `— ${tenantName}`,
        ].join("\n");

        const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5;color:#1F2937;max-width:560px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 16px;">${escHtml(greeting)}</p>
  <p style="margin:0 0 16px;">Just a reminder: <strong>${escHtml(studentName)}</strong> has class today.</p>
  <div style="background:#FBFAF7;border:1px solid #E5E7EB;border-left:3px solid #1AA876;border-radius:6px;padding:12px 16px;margin:0 0 16px;">
    <p style="margin:0;font-size:14px;">
      <strong>${escHtml(sessionDate)}</strong>
      &nbsp;<span style="font-family:ui-monospace,Menlo,monospace;font-weight:600;">${startLocal} – ${endLocal}</span>
    </p>
    <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">${escHtml(classroomName)}</p>
  </div>
  <p style="margin:0 0 16px;">See you there!</p>
  <p style="margin:0;color:#6B7280;font-size:13px;">— ${escHtml(tenantName)}</p>
</body></html>`;

        const res = await sendEmail({
          to: student.primary_email,
          subject: `Reminder: ${studentName} has class today`,
          text,
          html,
        });
        if ("ok" in res && res.ok) sent++;
      }

      return { remindersSent: sent };
    });
  }
);

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
