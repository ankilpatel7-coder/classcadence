import { and, eq, gte, inArray, lte, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  sessions,
  timeSlots,
  classrooms,
  locations,
  tenants,
  attendanceRecords,
  students,
} from "@/lib/db/schema";
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
  const now = new Date();
  const until = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

  // sessions -> time_slots -> classrooms -> locations -> tenants. Tenant scope
  // is pushed into the WHERE when a tenantId is given.
  const baseWhere = and(
    gte(sessions.scheduledStartUtc, now),
    lte(sessions.scheduledStartUtc, until),
    ne(sessions.status, "cancelled"),
    args.tenantId ? eq(locations.tenantId, args.tenantId) : undefined
  );

  const ses = await db
    .select({
      id: sessions.id,
      scheduledStartUtc: sessions.scheduledStartUtc,
      scheduledEndUtc: sessions.scheduledEndUtc,
      classroomName: classrooms.name,
      tz: locations.ianaTimezone,
      tenantName: tenants.name,
    })
    .from(sessions)
    .innerJoin(timeSlots, eq(timeSlots.id, sessions.timeSlotId))
    .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
    .innerJoin(locations, eq(locations.id, classrooms.locationId))
    .innerJoin(tenants, eq(tenants.id, locations.tenantId))
    .where(baseWhere);

  if (ses.length === 0) {
    return { considered: 0, sent: 0, skipped: 0 };
  }

  type SessionRow = (typeof ses)[number];
  const sessionById = new Map<string, SessionRow>();
  for (const s of ses) sessionById.set(s.id, s);

  const sessionIds = ses.map((s) => s.id);
  const att = await db
    .select({
      sessionId: attendanceRecords.sessionId,
      studentId: attendanceRecords.studentId,
    })
    .from(attendanceRecords)
    .where(
      and(
        inArray(attendanceRecords.sessionId, sessionIds),
        eq(attendanceRecords.status, "expected")
      )
    );

  if (att.length === 0) {
    return { considered: 0, sent: 0, skipped: 0 };
  }

  const studentIds = Array.from(new Set(att.map((a) => a.studentId)));
  const studentRows = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      primaryParentName: students.primaryParentName,
      primaryEmail: students.primaryEmail,
      notificationPrefsJson: students.notificationPrefsJson,
    })
    .from(students)
    .where(inArray(students.id, studentIds));

  type StudentRow = (typeof studentRows)[number];
  const studentById = new Map<string, StudentRow>();
  for (const s of studentRows) studentById.set(s.id, s);

  let sent = 0;
  let skipped = 0;

  for (const row of att) {
    const session = sessionById.get(row.sessionId);
    const student = studentById.get(row.studentId);
    if (!session || !student) {
      skipped++;
      continue;
    }
    const prefs = student.notificationPrefsJson as { email?: boolean } | null;
    const wantsEmail = prefs?.email !== false;
    if (!wantsEmail || !student.primaryEmail) {
      skipped++;
      continue;
    }

    const tz = session.tz;
    const classroomName = session.classroomName;
    const tenantName = session.tenantName;
    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const startIso = session.scheduledStartUtc.toISOString();
    const endIso = session.scheduledEndUtc.toISOString();
    const startLocal = formatTimeInTimezone(startIso, tz);
    const endLocal = formatTimeInTimezone(endIso, tz);
    const sessionDate = new Date(startIso).toLocaleDateString("en-US", {
      timeZone: tz,
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const greeting = student.primaryParentName
      ? `Hi ${student.primaryParentName},`
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
      to: student.primaryEmail,
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
