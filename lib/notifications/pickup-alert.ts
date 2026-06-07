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
import { createNotification } from "@/lib/notifications/create";

// Fired when a student is checked out: emails the primary parent that the
// student is ready for pickup. Email only (no in-app) — staff already know,
// the parent is the audience. Mirrors fireAbsentNotification's joins + opt-in.
export async function firePickupNotification(args: {
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

  const [studentRes, tenantRes] = await Promise.all([
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
  ]);

  const student = studentRes[0];
  if (!student) return;
  const prefs = student.notificationPrefsJson as { email?: boolean } | null;

  const wantsEmail = prefs?.email !== false;
  if (!wantsEmail || !student.primaryEmail) return;

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

  const res = await createNotification({
    tenantId: args.tenantId,
    type: "student_pickup",
    payload: {
      student_id: att.studentId,
      student_name: studentName,
      classroom_name: classroomName,
      date: sessionDate,
      time: startLocal,
    },
    email: {
      to: [
        {
          email: student.primaryEmail,
          name: student.primaryParentName ?? undefined,
        },
      ],
      subject: `${studentName} is ready for pickup`,
      text: buildPickupEmailText({
        parentName: student.primaryParentName,
        studentName,
        classroomName,
        tenantName,
      }),
      html: buildPickupEmailHtml({
        parentName: student.primaryParentName,
        studentName,
        classroomName,
        tenantName,
      }),
    },
  });

  // Surface the outcome — a "skipped" (missing RESEND_* env) or "error"
  // (e.g. unverified sending domain) is otherwise invisible since this runs
  // fire-and-forget.
  for (const r of res.emailResults) {
    if (r.status !== "sent") {
      console.error(`[pickup] email ${r.status} to ${r.to}: ${r.detail ?? ""}`);
    } else {
      console.log(`[pickup] email sent to ${r.to}`);
    }
  }
}

function buildPickupEmailText(args: {
  parentName: string | null;
  studentName: string;
  classroomName: string;
  tenantName: string;
}): string {
  const greeting = args.parentName ? `Hi ${args.parentName},` : "Hi there,";
  return [
    greeting,
    "",
    `${args.studentName} is ready for pickup from ${args.classroomName}.`,
    "",
    `Please come to the center to pick them up within the next 15 minutes.`,
    "",
    `— ${args.tenantName}`,
  ].join("\n");
}

function buildPickupEmailHtml(args: {
  parentName: string | null;
  studentName: string;
  classroomName: string;
  tenantName: string;
}): string {
  const greeting = args.parentName ? `Hi ${args.parentName},` : "Hi there,";
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5;color:#1F2937;max-width:560px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 16px;">${greeting}</p>
  <p style="margin:0 0 16px;"><strong>${escapeHtml(args.studentName)}</strong> is ready for pickup from ${escapeHtml(args.classroomName)}.</p>
  <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-left:3px solid #16A34A;border-radius:6px;padding:12px 16px;margin:0 0 16px;">
    <p style="margin:0;font-size:14px;">Please come to the center to pick them up within the next <strong>15 minutes</strong>.</p>
  </div>
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
