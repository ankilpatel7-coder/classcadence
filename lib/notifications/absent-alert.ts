import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attendanceRecords,
  sessions,
  timeSlots,
  classrooms,
  locations,
  students,
  tenants,
} from "@/lib/db/schema";
import { formatTimeInTimezone } from "@/lib/time";
import { createNotification, tenantAdminUserIds } from "@/lib/notifications/create";

export async function fireAbsentNotification(args: {
  tenantId: string;
  attendanceId: string;
}) {
  // attendance_record -> session (via session_id) -> time_slot -> classroom
  // -> location. See [[attendance-sessions-embed]]: join on session_id, not
  // made_up_in_session_id.
  const [att] = await db
    .select({
      studentId: attendanceRecords.studentId,
      scheduledStartUtc: sessions.scheduledStartUtc,
      classroomName: classrooms.name,
      tz: locations.ianaTimezone,
    })
    .from(attendanceRecords)
    .innerJoin(sessions, eq(sessions.id, attendanceRecords.sessionId))
    .innerJoin(timeSlots, eq(timeSlots.id, sessions.timeSlotId))
    .innerJoin(classrooms, eq(classrooms.id, timeSlots.classroomId))
    .innerJoin(locations, eq(locations.id, classrooms.locationId))
    .where(eq(attendanceRecords.id, args.attendanceId))
    .limit(1);
  if (!att) return;

  const [studentRes, tenantRes, adminIds] = await Promise.all([
    db
      .select({
        firstName: students.firstName,
        lastName: students.lastName,
        primaryParentName: students.primaryParentName,
        primaryEmail: students.primaryEmail,
        notificationPrefsJson: students.notificationPrefsJson,
      })
      .from(students)
      .where(eq(students.id, att.studentId))
      .limit(1),
    db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, args.tenantId))
      .limit(1),
    tenantAdminUserIds(args.tenantId),
  ]);

  const student = studentRes[0];
  if (!student) return;
  const prefs = student.notificationPrefsJson as { email?: boolean } | null;

  const tz = att.tz;
  const classroomName = att.classroomName;
  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const tenantName = tenantRes[0]?.name ?? "ClassCadence";

  const startIso = att.scheduledStartUtc.toISOString();
  const startLocal = formatTimeInTimezone(startIso, tz);
  const sessionDate = new Date(startIso).toLocaleDateString("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const payload = {
    student_id: att.studentId,
    student_name: studentName,
    classroom_name: classroomName,
    date: sessionDate,
    time: startLocal,
  };

  const wantsEmail = prefs?.email !== false;
  const sendToParent = wantsEmail && student.primaryEmail;

  await createNotification({
    tenantId: args.tenantId,
    type: "student_absent",
    payload,
    inApp: adminIds.map((id) => ({ user_id: id })),
    email: sendToParent
      ? {
          to: [
            {
              email: student.primaryEmail!,
              name: student.primaryParentName ?? undefined,
            },
          ],
          subject: `${studentName} missed ${classroomName} today`,
          text: buildAbsentEmailText({
            parentName: student.primaryParentName,
            studentName,
            classroomName,
            sessionDate,
            startLocal,
            tenantName,
          }),
          html: buildAbsentEmailHtml({
            parentName: student.primaryParentName,
            studentName,
            classroomName,
            sessionDate,
            startLocal,
            tenantName,
          }),
        }
      : undefined,
  });
}

function buildAbsentEmailText(args: {
  parentName: string | null;
  studentName: string;
  classroomName: string;
  sessionDate: string;
  startLocal: string;
  tenantName: string;
}): string {
  const greeting = args.parentName ? `Hi ${args.parentName},` : "Hi there,";
  return [
    greeting,
    "",
    `${args.studentName} was marked absent from today's class:`,
    "",
    `  • ${args.sessionDate} at ${args.startLocal} — ${args.classroomName}`,
    "",
    `If this was unexpected, reply to this email or call us so we can ` +
      `schedule a make-up.`,
    "",
    `— ${args.tenantName}`,
  ].join("\n");
}

function buildAbsentEmailHtml(args: {
  parentName: string | null;
  studentName: string;
  classroomName: string;
  sessionDate: string;
  startLocal: string;
  tenantName: string;
}): string {
  const greeting = args.parentName ? `Hi ${args.parentName},` : "Hi there,";
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5;color:#1F2937;max-width:560px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 16px;">${greeting}</p>
  <p style="margin:0 0 16px;"><strong>${escapeHtml(args.studentName)}</strong> was marked absent from today's class:</p>
  <div style="background:#FEF2F2;border:1px solid #FECACA;border-left:3px solid #EF4444;border-radius:6px;padding:12px 16px;margin:0 0 16px;">
    <p style="margin:0;font-size:14px;">
      <strong>${escapeHtml(args.sessionDate)}</strong>
      &nbsp;<span style="font-family:ui-monospace,Menlo,monospace;font-weight:600;">${args.startLocal}</span>
    </p>
    <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">${escapeHtml(args.classroomName)}</p>
  </div>
  <p style="margin:0 0 16px;">If this was unexpected, reply to this email or call us so we can schedule a make-up.</p>
  <p style="margin:0;color:#6B7280;font-size:13px;">— ${escapeHtml(args.tenantName)}</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
