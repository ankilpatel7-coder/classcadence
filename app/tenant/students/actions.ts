"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { materializeSessions } from "@/app/tenant/today/actions";
import {
  createNotification,
  tenantAdminUserIds,
} from "@/lib/notifications/create";

function emptyToNull<T extends z.ZodTypeAny>(schema: T) {
  return schema.transform((v) => (typeof v === "string" && v.length > 0 ? v : null));
}

function canWrite(role: string | null | undefined) {
  return (
    role === "tenant_admin" ||
    role === "location_admin" ||
    role === "front_desk" ||
    role === "super_admin"
  );
}

function collectFieldErrors(zErr: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of zErr.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

const StudentSchemaCore = z.object({
  location_id: z.string().uuid(),
  first_name: z.string().trim().min(1, "First name is required.").max(80),
  last_name: z.string().trim().min(1, "Last name is required.").max(80),
  dob: emptyToNull(z.string().trim().optional()),
  grade_level: emptyToNull(z.string().trim().max(40).optional()),
  lifecycle_status: z.enum([
    "lead",
    "trial",
    "active",
    "waitlist",
    "inactive",
    "withdrawn",
  ]),
  internal_notes: emptyToNull(z.string().trim().max(2000).optional()),
  primary_parent_name: z.string().trim().min(2, "Parent name is required.").max(120),
  primary_email: emptyToNull(z.string().trim().toLowerCase().optional()),
  primary_phone: emptyToNull(z.string().trim().optional()),
  secondary_parent_name: emptyToNull(z.string().trim().optional()),
  secondary_email: emptyToNull(z.string().trim().toLowerCase().optional()),
  secondary_phone: emptyToNull(z.string().trim().optional()),
  mailing_address: emptyToNull(z.string().trim().optional()),
  notify_email: z.string().optional(),
  notify_whatsapp: z.string().optional(),
});

const CreateStudentSchema = StudentSchemaCore.refine(
  (v) => Boolean(v.primary_email) || Boolean(v.primary_phone),
  {
    message: "Provide at least a primary email or phone.",
    path: ["primary_email"],
  }
);
const UpdateStudentSchema = StudentSchemaCore.extend({
  id: z.string().uuid(),
}).refine(
  (v) => Boolean(v.primary_email) || Boolean(v.primary_phone),
  {
    message: "Provide at least a primary email or phone.",
    path: ["primary_email"],
  }
);

export type StudentState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  success?: boolean;
};

function notifyPrefsFrom(notify_email?: string, notify_whatsapp?: string) {
  return {
    email: notify_email === "on" || notify_email === "true",
    whatsapp: notify_whatsapp === "on" || notify_whatsapp === "true",
  };
}

export async function createStudentAction(
  _prev: StudentState,
  formData: FormData
): Promise<StudentState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role) || !user.tenantId) {
    return { error: "Not allowed.", fieldErrors: {} };
  }

  const parsed = CreateStudentSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      error: "Fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const { notify_email, notify_whatsapp, ...rest } = parsed.data;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("students")
    .insert({
      ...rest,
      tenant_id: user.tenantId,
      notification_prefs_json: notifyPrefsFrom(notify_email, notify_whatsapp),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Insert failed.", fieldErrors: {} };
  }

  revalidatePath("/tenant/students");
  redirect(`/tenant/students/${data.id}/edit?created=1`);
}

export async function updateStudentAction(
  _prev: StudentState,
  formData: FormData
): Promise<StudentState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) return { error: "Not allowed.", fieldErrors: {} };

  const parsed = UpdateStudentSchema.safeParse({
    ...formDataToObject(formData),
    id: formData.get("id"),
  });
  if (!parsed.success) {
    return {
      error: "Fix the errors below.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const { id, notify_email, notify_whatsapp, ...updates } = parsed.data;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("students")
    .update({
      ...updates,
      notification_prefs_json: notifyPrefsFrom(notify_email, notify_whatsapp),
    })
    .eq("id", id);
  if (error) return { error: error.message, fieldErrors: {} };

  revalidatePath("/tenant/students");
  revalidatePath(`/tenant/students/${id}/edit`);
  return { error: null, fieldErrors: {}, success: true };
}

export async function deleteStudentAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) redirect("/tenant/students?error=forbidden");
  const id = formData.get("id");
  if (typeof id !== "string") redirect("/tenant/students?error=invalid-id");
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) redirect(`/tenant/students?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/tenant/students");
  redirect("/tenant/students?deleted=1");
}

function formDataToObject(fd: FormData): Record<string, unknown> {
  return {
    location_id: fd.get("location_id"),
    first_name: fd.get("first_name"),
    last_name: fd.get("last_name"),
    dob: fd.get("dob"),
    grade_level: fd.get("grade_level"),
    lifecycle_status: fd.get("lifecycle_status") || "active",
    internal_notes: fd.get("internal_notes"),
    primary_parent_name: fd.get("primary_parent_name"),
    primary_email: fd.get("primary_email"),
    primary_phone: fd.get("primary_phone"),
    secondary_parent_name: fd.get("secondary_parent_name"),
    secondary_email: fd.get("secondary_email"),
    secondary_phone: fd.get("secondary_phone"),
    mailing_address: fd.get("mailing_address"),
    notify_email: fd.get("notify_email"),
    notify_whatsapp: fd.get("notify_whatsapp"),
  };
}

// ============ Enrollments (re-export from old location) ============

const EnrollSchema = z.object({
  student_id: z.string().uuid(),
  time_slot_id: z.string().uuid(),
});

export type EnrollState = { error: string | null; success: boolean };

export async function enrollStudentAction(
  _prev: EnrollState,
  formData: FormData
): Promise<EnrollState> {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) return { error: "Not allowed.", success: false };

  const parsed = EnrollSchema.safeParse({
    student_id: formData.get("student_id"),
    time_slot_id: formData.get("time_slot_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", success: false };
  }

  const supabase = createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  // Look up slot + classroom + location info in one shot.
  const { data: slot } = await supabase
    .from("time_slots")
    .select(
      "id, weekday, capacity_override, classrooms!inner(id, name, default_capacity, locations!inner(id, max_classes_per_student_per_week))"
    )
    .eq("id", parsed.data.time_slot_id)
    .maybeSingle();
  type SlotRow = {
    id: string;
    weekday: string;
    capacity_override: number | null;
    classrooms: {
      id: string;
      name: string;
      default_capacity: number;
      locations: { id: string; max_classes_per_student_per_week: number };
    };
  };
  const slotRow = slot as unknown as SlotRow | null;
  if (!slotRow) return { error: "Slot not found.", success: false };

  const targetWeekday = slotRow.weekday;
  const targetClassroomId = slotRow.classrooms.id;
  const locId = slotRow.classrooms.locations.id;
  const cap = slotRow.classrooms.locations.max_classes_per_student_per_week;
  const slotCapacity =
    slotRow.capacity_override ?? slotRow.classrooms.default_capacity;

  // Strict gt so legacy rows with effective_to=today are treated as ended.
  const activeFilter = `effective_to.is.null,effective_to.gt.${today}`;

  // 1. Per-slot capacity + already-enrolled check.
  const { data: slotEnrollments } = await supabase
    .from("enrollments")
    .select("id, student_id")
    .eq("time_slot_id", parsed.data.time_slot_id)
    .or(activeFilter);

  const currentSlotCount = slotEnrollments?.length ?? 0;
  const alreadyEnrolled = (slotEnrollments ?? []).some(
    (e) => e.student_id === parsed.data.student_id
  );
  if (alreadyEnrolled) {
    return {
      error: "This student is already enrolled in this time slot.",
      success: false,
    };
  }
  if (currentSlotCount >= slotCapacity) {
    return {
      error: `This time slot is full (${currentSlotCount}/${slotCapacity}). Pick another slot.`,
      success: false,
    };
  }

  // 2. All active enrollments for this student — used for same-day,
  //    same-classroom, and location quota checks.
  const { data: existing } = await supabase
    .from("enrollments")
    .select(
      "id, effective_to, time_slots!inner(weekday, classrooms!inner(id, name, locations!inner(id)))"
    )
    .eq("student_id", parsed.data.student_id)
    .or(activeFilter);

  type Existing = {
    id: string;
    effective_to: string | null;
    time_slots: {
      weekday: string;
      classrooms: { id: string; name: string; locations: { id: string } };
    };
  };
  const existingTyped = (existing ?? []) as unknown as Existing[];

  // 2a. One classroom per student.
  const otherClassroom = existingTyped.find(
    (e) => e.time_slots.classrooms.id !== targetClassroomId
  );
  if (otherClassroom) {
    return {
      error:
        `This student is already in ${otherClassroom.time_slots.classrooms.name}. ` +
        `Each student belongs to one classroom — remove their existing classes ` +
        `before switching.`,
      success: false,
    };
  }

  // 2b. One class per weekday rule.
  const sameDay = existingTyped.find(
    (e) => e.time_slots.weekday === targetWeekday
  );
  if (sameDay) {
    return {
      error:
        `This student already has a class on ` +
        `${targetWeekday.toUpperCase()}. Each student can only attend one ` +
        `class per day — remove the existing one to switch.`,
      success: false,
    };
  }

  // 2c. Per-location class quota.
  const existingAtLocation = existingTyped.filter(
    (e) => e.time_slots.classrooms.locations.id === locId
  );
  if (existingAtLocation.length >= cap) {
    return {
      error:
        `This student already has ${existingAtLocation.length} active ` +
        `class${existingAtLocation.length === 1 ? "" : "es"} at this location ` +
        `(cap: ${cap}/week). End an existing enrollment first.`,
      success: false,
    };
  }

  const { error } = await supabase.from("enrollments").insert({
    student_id: parsed.data.student_id,
    time_slot_id: parsed.data.time_slot_id,
    effective_from: today,
  });
  if (error) return { error: error.message, success: false };

  // Targeted materialize — only the slot this student just enrolled into,
  // not every slot in the tenant. Fast.
  await materializeSessions(14, [parsed.data.time_slot_id]).catch(() => {});

  // Fire-and-forget notification fan-out. Failures are swallowed inside
  // the helper so a Resend hiccup never blocks an enrollment.
  fireEnrollmentNotification({
    tenantId: user.tenantId!,
    studentId: parsed.data.student_id,
    timeSlotId: parsed.data.time_slot_id,
  }).catch((err) =>
    console.error("[enroll] notification failed:", err)
  );

  // Immediate UI update: re-render the edit page so Current Classes picks
  // up the new enrollment without waiting for the next navigation.
  revalidatePath(`/tenant/students/${parsed.data.student_id}/edit`);
  revalidatePath("/tenant/today");
  revalidatePath("/tenant/schedule");
  return { error: null, success: true };
}

const WEEKDAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

async function fireEnrollmentNotification(args: {
  tenantId: string;
  studentId: string;
  timeSlotId: string;
}) {
  const service = createSupabaseServiceClient();

  const [studentRes, tenantRes, slotRes, adminIds] = await Promise.all([
    service
      .from("students")
      .select(
        "first_name, last_name, primary_parent_name, primary_email, notification_prefs_json"
      )
      .eq("id", args.studentId)
      .maybeSingle(),
    service
      .from("tenants")
      .select("name")
      .eq("id", args.tenantId)
      .maybeSingle(),
    service
      .from("time_slots")
      .select("weekday, start_time, end_time, classrooms!inner(name)")
      .eq("id", args.timeSlotId)
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

  const slot = slotRes.data as
    | {
        weekday: string;
        start_time: string;
        end_time: string;
        classrooms: { name: string };
      }
    | null;
  if (!slot) return;

  const tenant = tenantRes.data as { name: string } | null;

  const studentName = `${student.first_name} ${student.last_name}`.trim();
  const classroomName = slot.classrooms.name;
  const weekdayLabel = WEEKDAY_LABELS[slot.weekday] ?? slot.weekday;
  const startTime = String(slot.start_time).slice(0, 5);
  const endTime = String(slot.end_time).slice(0, 5);
  const tenantName = tenant?.name ?? "ClassCadence";

  const payload = {
    student_id: args.studentId,
    student_name: studentName,
    classroom_name: classroomName,
    weekday: slot.weekday,
    start_time: startTime,
    end_time: endTime,
  };

  // Email goes to parent if they have an address and haven't opted out.
  const wantsEmail = student.notification_prefs_json?.email !== false;
  const sendToParent = wantsEmail && student.primary_email;

  await createNotification({
    tenantId: args.tenantId,
    type: "enrollment_confirmed",
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
          subject: `${studentName}'s class at ${tenantName}`,
          text: buildEnrollmentEmailText({
            parentName: student.primary_parent_name,
            studentName,
            classroomName,
            weekdayLabel,
            startTime,
            endTime,
            tenantName,
          }),
          html: buildEnrollmentEmailHtml({
            parentName: student.primary_parent_name,
            studentName,
            classroomName,
            weekdayLabel,
            startTime,
            endTime,
            tenantName,
          }),
        }
      : undefined,
  });
}

function buildEnrollmentEmailText(args: {
  parentName: string | null;
  studentName: string;
  classroomName: string;
  weekdayLabel: string;
  startTime: string;
  endTime: string;
  tenantName: string;
}): string {
  const greeting = args.parentName ? `Hi ${args.parentName},` : "Hi there,";
  return [
    greeting,
    "",
    `${args.studentName} is now enrolled at ${args.tenantName}:`,
    "",
    `  • ${args.weekdayLabel} ${args.startTime} – ${args.endTime} — ${args.classroomName}`,
    "",
    `See you ${args.weekdayLabel}!`,
    "",
    `— ${args.tenantName}`,
  ].join("\n");
}

function buildEnrollmentEmailHtml(args: {
  parentName: string | null;
  studentName: string;
  classroomName: string;
  weekdayLabel: string;
  startTime: string;
  endTime: string;
  tenantName: string;
}): string {
  const greeting = args.parentName ? `Hi ${args.parentName},` : "Hi there,";
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5;color:#1F2937;max-width:560px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 16px;">${greeting}</p>
  <p style="margin:0 0 16px;"><strong>${escapeHtml(args.studentName)}</strong> is now enrolled at ${escapeHtml(args.tenantName)}:</p>
  <div style="background:#FBFAF7;border:1px solid #E5E7EB;border-left:3px solid #1AA876;border-radius:6px;padding:12px 16px;margin:0 0 16px;">
    <p style="margin:0;font-size:14px;">
      <strong>${escapeHtml(args.weekdayLabel)}</strong>
      &nbsp;<span style="font-family:ui-monospace,Menlo,monospace;font-weight:600;">${args.startTime} – ${args.endTime}</span>
    </p>
    <p style="margin:4px 0 0;font-size:13px;color:#6B7280;">${escapeHtml(args.classroomName)}</p>
  </div>
  <p style="margin:0 0 16px;">See you ${escapeHtml(args.weekdayLabel)}!</p>
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

export async function endEnrollmentAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  if (!canWrite(user.role)) redirect("/tenant/students");

  const id = formData.get("id");
  const studentId = formData.get("student_id");
  if (typeof id !== "string" || typeof studentId !== "string") {
    redirect("/tenant/students?error=invalid-id");
  }

  const supabase = createSupabaseServerClient();

  // 1. Look up the time slot for downstream cleanup before deleting.
  const { data: en } = await supabase
    .from("enrollments")
    .select("time_slot_id")
    .eq("id", id)
    .maybeSingle();
  const slotId = (en?.time_slot_id as string | undefined) ?? null;

  // 2. Hard-delete the enrollment. Past attendance survives (it's the audit
  //    trail of what happened). Future "expected" rows we clean up below.
  const { error } = await supabase.from("enrollments").delete().eq("id", id);
  if (error) {
    redirect(
      `/tenant/students/${studentId}/edit?error=${encodeURIComponent(error.message)}`
    );
  }

  // 3. Clean up upcoming "expected" attendance for this student + slot so the
  //    student doesn't keep showing on Today / Schedule for future weeks.
  if (slotId) {
    const nowIso = new Date().toISOString();
    const { data: futureSessions } = await supabase
      .from("sessions")
      .select("id")
      .eq("time_slot_id", slotId)
      .gte("scheduled_start_utc", nowIso);
    const sessionIds = (futureSessions ?? []).map((s) => s.id as string);
    if (sessionIds.length > 0) {
      await supabase
        .from("attendance_records")
        .delete()
        .eq("status", "expected")
        .eq("student_id", studentId)
        .in("session_id", sessionIds);
    }
  }

  revalidatePath(`/tenant/students/${studentId}/edit`);
  revalidatePath("/tenant/today");
  revalidatePath("/tenant/schedule");
  redirect(`/tenant/students/${studentId}/edit?ended=1`);
}
