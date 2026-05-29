import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatTimeInTimezone } from "@/lib/time";
import { createNotification, tenantAdminUserIds } from "@/lib/notifications/create";

export async function fireAbsentNotification(args: {
  tenantId: string;
  attendanceId: string;
}) {
  const service = createSupabaseServiceClient();

  const { data: attendance } = await service
    .from("attendance_records")
    .select(
      "student_id, sessions!session_id!inner(scheduled_start_utc, scheduled_end_utc, time_slots!inner(classrooms!inner(name, locations!inner(iana_timezone))))"
    )
    .eq("id", args.attendanceId)
    .maybeSingle();

  type Row = {
    student_id: string;
    sessions: {
      scheduled_start_utc: string;
      scheduled_end_utc: string;
      time_slots: {
        classrooms: {
          name: string;
          locations: { iana_timezone: string };
        };
      };
    };
  };
  const att = attendance as unknown as Row | null;
  if (!att) return;

  const [studentRes, tenantRes, adminIds] = await Promise.all([
    service
      .from("students")
      .select(
        "first_name, last_name, primary_parent_name, primary_email, notification_prefs_json"
      )
      .eq("id", att.student_id)
      .maybeSingle(),
    service
      .from("tenants")
      .select("name")
      .eq("id", args.tenantId)
      .maybeSingle(),
    tenantAdminUserIds(args.tenantId),
  ]);

  const student = studentRes.data as
    | {
        first_name: string;
        last_name: string;
        primary_parent_name: string | null;
        primary_email: string | null;
        notification_prefs_json: { email?: boolean } | null;
      }
    | null;
  if (!student) return;

  const tz = att.sessions.time_slots.classrooms.locations.iana_timezone;
  const classroomName = att.sessions.time_slots.classrooms.name;
  const studentName = `${student.first_name} ${student.last_name}`.trim();
  const tenantName = (tenantRes.data as { name: string } | null)?.name ?? "ClassCadence";

  const startLocal = formatTimeInTimezone(att.sessions.scheduled_start_utc, tz);
  const sessionDate = new Date(att.sessions.scheduled_start_utc).toLocaleDateString(
    "en-US",
    {
      timeZone: tz,
      weekday: "long",
      month: "short",
      day: "numeric",
    }
  );

  const payload = {
    student_id: att.student_id,
    student_name: studentName,
    classroom_name: classroomName,
    date: sessionDate,
    time: startLocal,
  };

  const wantsEmail = student.notification_prefs_json?.email !== false;
  const sendToParent = wantsEmail && student.primary_email;

  await createNotification({
    tenantId: args.tenantId,
    type: "student_absent",
    payload,
    inApp: adminIds.map((id) => ({ user_id: id })),
    email: sendToParent
      ? {
          to: [
            {
              email: student.primary_email!,
              name: student.primary_parent_name ?? undefined,
            },
          ],
          subject: `${studentName} missed ${classroomName} today`,
          text: buildAbsentEmailText({
            parentName: student.primary_parent_name,
            studentName,
            classroomName,
            sessionDate,
            startLocal,
            tenantName,
          }),
          html: buildAbsentEmailHtml({
            parentName: student.primary_parent_name,
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
