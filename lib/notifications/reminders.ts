import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/client";
import { formatTimeInTimezone } from "@/lib/time";

// Shared "send today-ish reminders" implementation. Called both by:
//   - the Inngest daily cron (12:00 UTC)
//   - the "Send today's reminders" button on the tenant dashboard
//
// Window defaults to 18h so a morning cron catches everything through
// late evening. The dashboard button can override with a tighter window
// or scope by tenant.

export type SendRemindersArgs = {
  windowHours?: number;
  tenantId?: string; // restrict to one tenant (dashboard use)
};

export type SendRemindersResult = {
  considered: number;
  sent: number;
  skipped: number;
};

export async function sendDayOfReminders(
  args: SendRemindersArgs = {}
): Promise<SendRemindersResult> {
  const windowHours = args.windowHours ?? 18;
  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const until = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  let sessionsQuery = supabase
    .from("sessions")
    .select(
      "id, scheduled_start_utc, scheduled_end_utc, time_slots!inner(classrooms!inner(name, locations!inner(iana_timezone, tenant_id, tenants!inner(name))))"
    )
    .gte("scheduled_start_utc", now.toISOString())
    .lte("scheduled_start_utc", until.toISOString())
    .neq("status", "cancelled");

  const { data: sessions } = await sessionsQuery;

  type SessionRow = {
    id: string;
    scheduled_start_utc: string;
    scheduled_end_utc: string;
    time_slots: {
      classrooms: {
        name: string;
        locations: {
          iana_timezone: string;
          tenant_id: string;
          tenants: { name: string };
        };
      };
    };
  };
  let ses = (sessions ?? []) as unknown as SessionRow[];

  // Tenant scoping is enforced in JS because the foreign-key chain
  // (sessions -> time_slots -> classrooms -> locations -> tenant_id)
  // is deep enough that filtering it via PostgREST embed gets brittle.
  if (args.tenantId) {
    ses = ses.filter(
      (s) => s.time_slots.classrooms.locations.tenant_id === args.tenantId
    );
  }
  if (ses.length === 0) {
    return { considered: 0, sent: 0, skipped: 0 };
  }

  const sessionById = new Map<string, SessionRow>();
  for (const s of ses) sessionById.set(s.id, s);

  const sessionIds = ses.map((s) => s.id);
  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("session_id, student_id")
    .in("session_id", sessionIds)
    .eq("status", "expected");

  type AttRow = { session_id: string; student_id: string };
  const att = (attendance ?? []) as unknown as AttRow[];
  if (att.length === 0) {
    return { considered: 0, sent: 0, skipped: 0 };
  }

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
  let skipped = 0;

  for (const row of att) {
    const session = sessionById.get(row.session_id);
    const student = studentById.get(row.student_id);
    if (!session || !student) {
      skipped++;
      continue;
    }
    const wantsEmail = student.notification_prefs_json?.email !== false;
    if (!wantsEmail || !student.primary_email) {
      skipped++;
      continue;
    }

    const tz = session.time_slots.classrooms.locations.iana_timezone;
    const classroomName = session.time_slots.classrooms.name;
    const tenantName = session.time_slots.classrooms.locations.tenants.name;
    const studentName = `${student.first_name} ${student.last_name}`.trim();
    const startLocal = formatTimeInTimezone(session.scheduled_start_utc, tz);
    const endLocal = formatTimeInTimezone(session.scheduled_end_utc, tz);
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
    else skipped++;
  }

  return { considered: att.length, sent, skipped };
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
